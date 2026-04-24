import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../config/config.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from '../common/types/jwt-payload.type';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: AppConfigService,
  ) {}

  /**
   * Register a new user with a new organization.
   * The registering user becomes the ADMIN of the new org.
   */
  async register(dto: RegisterDto, req?: any) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Generate slug from org name if not provided
    const slug =
      dto.organizationSlug ||
      dto.organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    // Check if slug is taken
    const existingOrg = await this.prisma.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      throw new ConflictException('Organization slug already taken');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // Create organization + admin user in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName,
          slug,
        },
      });

      const user = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'ADMIN', // First user is always ADMIN
          organizationId: organization.id,
        },
      });

      return { user, organization };
    });

    // Generate tokens
    const tokens = await this.generateTokens({
      sub: result.user.id,
      orgId: result.organization.id,
      role: result.user.role,
    });

    // Store refresh token (hashed) with device info
    await this.storeRefreshToken(result.user.id, tokens.refreshToken, req);

    this.logger.log(
      `New registration: ${dto.email} → org: ${result.organization.slug}`,
    );

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken, // Controller sets this as cookie
    };
  }

  /**
   * Login with email and password.
   */
  async login(dto: LoginDto, req?: any) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    if (!user.password) {
      throw new UnauthorizedException('Please login with your OAuth provider');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens({
      sub: user.id,
      orgId: user.organizationId,
      role: user.role,
    });

    // Store refresh token (hashed) with device info
    await this.storeRefreshToken(user.id, tokens.refreshToken, req);

    this.logger.log(`Login: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken, // Controller sets this as cookie
    };
  }

  /**
   * Get current user profile and organization.
   * Used by the /auth/me endpoint (Bearer token auth).
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
      },
    };
  }

  /**
   * Validate and login/register a user via OAuth (Google).
   */
  async validateOAuthUser(profile: any, req?: any) {
    const { email, googleId, firstName, lastName } = profile;

    // 1. Try to find user by googleId
    let user = await this.prisma.user.findUnique({
      where: { googleId },
      include: { organization: true },
    });

    if (!user) {
      // 2. Try to find user by email (linking accounts)
      user = await this.prisma.user.findUnique({
        where: { email },
        include: { organization: true },
      });

      if (user) {
        // Link the Google ID and update provider
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId, authProvider: 'GOOGLE' },
          include: { organization: true },
        });
      } else {
        // 3. User doesn't exist at all. We need to create an org for them
        // In a real app, you might ask them to join an org or create a personal one.
        // For simplicity, we'll auto-create a personal workspace.
        const orgName = `${firstName}'s Workspace`;
        const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString().slice(-4);
        
        const result = await this.prisma.$transaction(async (tx) => {
          const organization = await tx.organization.create({
            data: { name: orgName, slug },
          });

          const newUser = await tx.user.create({
            data: {
              email,
              firstName: firstName || 'User',
              lastName: lastName || '',
              authProvider: 'GOOGLE',
              googleId,
              role: 'ADMIN',
              organizationId: organization.id,
            },
            include: { organization: true },
          });
          return newUser;
        });
        user = result;
      }
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Generate tokens
    const tokens = await this.generateTokens({
      sub: user.id,
      orgId: user.organizationId,
      role: user.role,
    });

    // Store refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken, req);

    this.logger.log(`OAuth Login: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Refresh tokens using a valid refresh token.
   *
   * FIX 2: Context binding — logs warning if IP/device changed significantly
   * FIX 3: Replay race condition — entire flow wrapped in Prisma transaction
   */
  async refreshTokens(userId: string, refreshToken: string, req?: any) {
    const hashedToken = this.hashToken(refreshToken);

    // Wrap in transaction to prevent replay race condition
    const result = await this.prisma.$transaction(async (tx) => {
      // Find the token — must be valid (not revoked AND not expired)
      const storedToken = await tx.refreshToken.findFirst({
        where: {
          token: hashedToken,
          userId,
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
        include: { user: { include: { organization: true } } },
      });

      if (!storedToken) {
        // Possible token theft — revoke ALL tokens for this user
        await tx.refreshToken.updateMany({
          where: { userId },
          data: { isRevoked: true },
        });
        this.logger.warn(`Refresh token reuse detected for user: ${userId}`);
        throw new UnauthorizedException('Invalid refresh token');
      }

      // FIX 2: Context binding — detect suspicious context changes
      const currentIp = this.extractIp(req);
      if (storedToken.ipAddress && currentIp && storedToken.ipAddress !== currentIp) {
        this.logger.warn(
          `Refresh token used from different IP. ` +
          `User: ${userId}, Original: ${storedToken.ipAddress}, Current: ${currentIp}`,
        );
        // Note: We log but don't block — different IP is common (mobile → wifi).
        // For high-security apps, you could revoke all tokens here.
      }

      // Revoke the old token (rotation) — inside the same transaction
      await tx.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      });

      return storedToken;
    });

    // Generate new token pair (outside transaction — no DB conflict)
    const tokens = await this.generateTokens({
      sub: result.user.id,
      orgId: result.user.organizationId,
      role: result.user.role,
    });

    // Store new refresh token with current device info
    await this.storeRefreshToken(result.user.id, tokens.refreshToken, req);

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken, // Controller sets this as cookie
    };
  }

  /**
   * Logout — revoke the current refresh token.
   */
  async logout(userId: string, refreshToken: string) {
    const hashedToken = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { token: hashedToken, userId },
      data: { isRevoked: true },
    });
    this.logger.log(`Logout: userId ${userId}`);
  }

  /**
   * Logout from all devices — revoke ALL refresh tokens for a user.
   */
  async logoutAll(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    this.logger.log(`Logout all devices: userId ${userId}`);
  }

  /**
   * Get active sessions for a user (for "logged in devices" UI).
   */
  async getActiveSessions(userId: string) {
    return this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        device: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Revoke a specific session by token ID (selective logout).
   */
  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.refreshToken.findFirst({
      where: { id: sessionId, userId, isRevoked: false },
    });

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    await this.prisma.refreshToken.update({
      where: { id: sessionId },
      data: { isRevoked: true },
    });
  }

  /**
   * Generate access + refresh token pair.
   */
  private async generateTokens(payload: JwtPayload) {
    const tokenPayload = { sub: payload.sub, orgId: payload.orgId, role: payload.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(tokenPayload, {
        secret: this.config.jwtAccessSecret,
        expiresIn: this.config.jwtAccessExpiration as any,
      }),
      this.jwtService.signAsync(tokenPayload, {
        secret: this.config.jwtRefreshSecret,
        expiresIn: this.config.jwtRefreshExpiration as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Store a HASHED refresh token in the database with device info.
   * FIX 1: Token is SHA-256 hashed — raw token is NEVER stored.
   */
  private async storeRefreshToken(userId: string, rawToken: string, req?: any) {
    const hashedToken = this.hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Extract device info from request
    const device = req?.headers?.['user-agent']?.substring(0, 255) || null;
    const ipAddress = this.extractIp(req);

    await this.prisma.refreshToken.upsert({
      where: { token: hashedToken },
      create: {
        token: hashedToken,
        userId,
        device,
        ipAddress,
        expiresAt,
      },
      update: {
        // Token already exists (very rare collision or retry) — refresh expiry
        isRevoked: false,
        expiresAt,
        device,
        ipAddress,
      },
    });
  }

  /**
   * Extract client IP from request (handles proxies).
   */
  private extractIp(req?: any): string | null {
    if (!req) return null;
    return (
      (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      null
    );
  }

  /**
   * Hash a token using SHA-256 for secure storage.
   * FIX 1: Even if DB is compromised, raw tokens cannot be recovered.
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
