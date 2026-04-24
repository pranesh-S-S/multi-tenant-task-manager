import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtRefreshGuard } from '../common/guards/jwt-refresh.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { AppConfigService } from '../config/config.service';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthGuard } from '@nestjs/passport';

/**
 * Cookie configuration for refresh tokens.
 * FIX 4: HttpOnly, Secure, SameSite for maximum security.
 */
const REFRESH_COOKIE_NAME = 'refresh_token';

@Controller('auth')
@UseGuards(ThrottlerGuard) // Rate limit all auth endpoints
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Helper: Set refresh token as a secure httpOnly cookie.
   */
  private setRefreshCookie(res: any, refreshToken: string) {
    const cookieOptions: any = {
      httpOnly: true,                     // JS cannot access (XSS safe)
      secure: this.config.isProduction,   // HTTPS only in production
      sameSite: 'lax' as const,           // CSRF protection (allows top-level nav)
      maxAge: 7 * 24 * 60 * 60 * 1000,   // 7 days in ms
      path: '/',                          // Available on all routes (safe with httpOnly+sameSite)
    };
    // Add domain for subdomain cookie sharing (e.g., '.yourdomain.com')
    if (this.config.cookieDomain) {
      cookieOptions.domain = this.config.cookieDomain;
    }
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);
  }

  /**
   * Helper: Clear the refresh token cookie on logout.
   */
  private clearRefreshCookie(res: any) {
    const cookieOptions: any = {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax' as const,
      path: '/',
    };
    if (this.config.cookieDomain) {
      cookieOptions.domain = this.config.cookieDomain;
    }
    res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions);
  }

  /**
   * POST /auth/register
   * Creates a new organization and admin user.
   * Sets refresh token as httpOnly cookie.
   */
  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const result = await this.authService.register(dto, req);
    if (result.refreshToken) {
      this.setRefreshCookie(res, result.refreshToken);
    }
    // Don't expose refresh token in response body
    const { refreshToken, ...response } = result;
    return response;
  }

  /**
   * POST /auth/login
   * Returns access token in body, sets refresh token as httpOnly cookie.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const result = await this.authService.login(dto, req);
    this.setRefreshCookie(res, result.refreshToken);
    // Don't expose refresh token in response body
    const { refreshToken, ...response } = result;
    return response;
  }

  /**
   * POST /auth/refresh
   * Rotates refresh token and returns new access token.
   * Expired access token → 401 → frontend calls this endpoint.
   * New refresh token set as httpOnly cookie.
   */
  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const { sub, refreshToken } = req.user;
    const result = await this.authService.refreshTokens(sub, refreshToken, req);
    this.setRefreshCookie(res, result.refreshToken);
    const { refreshToken: newToken, ...response } = result;
    return response;
  }

  /**
   * GET /auth/me
   * Returns the current user's profile and organization.
   * Requires a valid access token (Bearer).
   */
  @Get('me')
  async getMe(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub);
  }

  /**
   * POST /auth/logout
   * Revokes the current refresh token and clears the cookie.
   */
  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const { sub, refreshToken } = req.user;
    await this.authService.logout(sub, refreshToken);
    this.clearRefreshCookie(res);
    return { message: 'Logged out successfully' };
  }

  /**
   * POST /auth/logout-all
   * Revokes ALL refresh tokens and clears the cookie.
   */
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: any,
  ) {
    await this.authService.logoutAll(user.sub);
    this.clearRefreshCookie(res);
    return { message: 'Logged out from all devices' };
  }

  /**
   * GET /auth/sessions
   * Returns all active sessions for the current user.
   */
  @Get('sessions')
  async getActiveSessions(@CurrentUser() user: JwtPayload) {
    return this.authService.getActiveSessions(user.sub);
  }

  /**
   * DELETE /auth/sessions/:id
   * Revoke a specific session (selective logout from another device).
   */
  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  async revokeSession(
    @CurrentUser() user: JwtPayload,
    @Param('id') sessionId: string,
  ) {
    await this.authService.revokeSession(user.sub, sessionId);
    return { message: 'Session revoked' };
  }

  // ─── GOOGLE OAUTH ───────────────────────────────────────

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: any) {
    // Initiates the Google OAuth flow
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: any, @Res() res: any) {
    // Passport adds the authenticated user to req.user via the strategy's validate method
    const result = await this.authService.validateOAuthUser(req.user, req);

    this.setRefreshCookie(res, result.refreshToken);

    // Build frontend redirect URL with access token (to bootstrap the frontend app state)
    // In a real production app, consider using httpOnly cookies for access tokens too 
    // or pass an auth code. Passing token in URL hash/query is common but has slight risks.
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?accessToken=${result.accessToken}`);
  }
}
