import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto, UpdateProfileDto } from './dto/update-user.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

/** Common user select fields — used across all queries. */
const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  jobTitle: true,
  isActive: true,
  createdAt: true,
} as const;

/**
 * Users Service.
 * All queries are tenant-scoped via user.orgId.
 * RBAC: Guards check role. This service checks ownership.
 */
@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private activityLogs: ActivityLogsService,
  ) {}

  /**
   * Find all users in the current organization.
   */
  async findAll(user: JwtPayload) {
    return this.prisma.user.findMany({
      where: { organizationId: user.orgId },
      select: USER_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Find a single user by ID within the current organization.
   */
  async findOne(user: JwtPayload, userId: string) {
    const found = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: user.orgId },
      select: USER_SELECT,
    });

    if (!found) {
      throw new NotFoundException('User not found');
    }

    return found;
  }

  /**
   * Get current user's own profile.
   */
  async getProfile(user: JwtPayload) {
    return this.prisma.user.findUnique({
      where: { id: user.sub },
      select: {
        ...USER_SELECT,
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  /**
   * Update current user's own profile (name, jobTitle — not role or email).
   */
  async updateProfile(user: JwtPayload, dto: UpdateProfileDto) {
    const updated = await this.prisma.user.update({
      where: { id: user.sub },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.jobTitle !== undefined && { jobTitle: dto.jobTitle }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        jobTitle: true,
      },
    });

    await this.activityLogs.log({
      userId: user.sub,
      organizationId: user.orgId,
      action: 'UPDATE_USER',
      entityType: 'USER',
      entityId: user.sub,
      metadata: { changes: dto },
    });

    return updated;
  }

  /**
   * Invite/add a new member to the organization (admin only).
   */
  async inviteMember(user: JwtPayload, dto: InviteMemberDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const newUser = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role || 'MEMBER',
        jobTitle: dto.jobTitle,
        organizationId: user.orgId,
      },
      select: USER_SELECT,
    });

    await this.activityLogs.log({
      userId: user.sub,
      organizationId: user.orgId,
      action: 'CREATE_USER',
      entityType: 'USER',
      entityId: newUser.id,
      metadata: { email: newUser.email, role: newUser.role },
    });

    return newUser;
  }

  /**
   * Update a member's role and/or job title (admin only).
   * Cannot demote yourself (prevents org lockout).
   */
  async updateMemberRole(
    user: JwtPayload,
    memberId: string,
    dto: UpdateMemberRoleDto,
  ) {
    const member = await this.prisma.user.findFirst({
      where: { id: memberId, organizationId: user.orgId },
    });

    if (!member) {
      throw new NotFoundException('User not found');
    }

    if (member.id === user.sub && dto.role) {
      throw new ForbiddenException('You cannot modify your own role');
    }

    const updated = await this.prisma.user.update({
      where: { id: member.id },
      data: {
        ...(dto.role && { role: dto.role }),
        ...(dto.jobTitle !== undefined && { jobTitle: dto.jobTitle }),
      },
      select: USER_SELECT,
    });

    await this.activityLogs.log({
      userId: user.sub,
      organizationId: user.orgId,
      action: 'UPDATE_USER',
      entityType: 'USER',
      entityId: member.id,
      metadata: { previousRole: member.role, newRole: dto.role, jobTitle: dto.jobTitle },
    });

    return updated;
  }

  /**
   * Deactivate a member (admin only, soft disable).
   * Cannot deactivate yourself.
   */
  async deactivateMember(user: JwtPayload, memberId: string) {
    const member = await this.prisma.user.findFirst({
      where: { id: memberId, organizationId: user.orgId },
    });

    if (!member) {
      throw new NotFoundException('User not found');
    }

    if (member.id === user.sub) {
      throw new ForbiddenException('You cannot deactivate yourself');
    }

    if (!member.isActive) {
      throw new ConflictException('Member is already deactivated');
    }

    const updated = await this.prisma.user.update({
      where: { id: member.id },
      data: { isActive: false },
      select: USER_SELECT,
    });

    // Revoke all refresh tokens for deactivated user
    await this.prisma.refreshToken.updateMany({
      where: { userId: member.id, isRevoked: false },
      data: { isRevoked: true },
    });

    await this.activityLogs.log({
      userId: user.sub,
      organizationId: user.orgId,
      action: 'DEACTIVATE_USER',
      entityType: 'USER',
      entityId: member.id,
      metadata: { email: member.email },
    });

    return updated;
  }

  /**
   * Reactivate a deactivated member (admin only).
   * Cannot reactivate yourself.
   */
  async reactivateMember(user: JwtPayload, memberId: string) {
    const member = await this.prisma.user.findFirst({
      where: { id: memberId, organizationId: user.orgId },
    });

    if (!member) {
      throw new NotFoundException('User not found');
    }

    if (member.id === user.sub) {
      throw new ForbiddenException('You cannot reactivate yourself');
    }

    if (member.isActive) {
      throw new ConflictException('Member is already active');
    }

    const updated = await this.prisma.user.update({
      where: { id: member.id },
      data: { isActive: true },
      select: USER_SELECT,
    });

    await this.activityLogs.log({
      userId: user.sub,
      organizationId: user.orgId,
      action: 'UPDATE_USER',
      entityType: 'USER',
      entityId: member.id,
      metadata: { action: 'reactivated', email: member.email },
    });

    return updated;
  }

  /**
   * Find a user by email (used internally by AuthService).
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }
}
