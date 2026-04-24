import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto, UpdateProfileDto } from './dto/update-user.dto';

/**
 * Users Controller.
 * All routes are JWT-protected (global guard).
 * Admin-only routes use @Roles('ADMIN').
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── Self (any authenticated user) ───────────────────────

  /**
   * GET /users/me — Get current user's profile.
   */
  @Get('me')
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.usersService.getProfile(user);
  }

  /**
   * PATCH /users/me — Update current user's profile.
   */
  @Patch('me')
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user, dto);
  }

  // ─── Team management (any authenticated user can read) ───

  /**
   * GET /users — List all users in the current organization.
   */
  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.usersService.findAll(user);
  }

  /**
   * GET /users/:id — Get a single user by ID.
   */
  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.usersService.findOne(user, id);
  }

  // ─── Admin-only operations ───────────────────────────────

  /**
   * POST /users/invite — Invite/add a new member to the org.
   */
  @Post('invite')
  @Roles('ADMIN')
  inviteMember(
    @CurrentUser() user: JwtPayload,
    @Body() dto: InviteMemberDto,
  ) {
    return this.usersService.inviteMember(user, dto);
  }

  /**
   * PATCH /users/:id/role — Update a member's role.
   */
  @Patch(':id/role')
  @Roles('ADMIN')
  updateMemberRole(
    @CurrentUser() user: JwtPayload,
    @Param('id') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.usersService.updateMemberRole(user, memberId, dto);
  }

  /**
   * DELETE /users/:id — Deactivate a member (soft disable).
   */
  @Delete(':id')
  @Roles('ADMIN')
  deactivateMember(
    @CurrentUser() user: JwtPayload,
    @Param('id') memberId: string,
  ) {
    return this.usersService.deactivateMember(user, memberId);
  }

  /**
   * PATCH /users/:id/reactivate — Reactivate a deactivated member.
   */
  @Patch(':id/reactivate')
  @Roles('ADMIN')
  reactivateMember(
    @CurrentUser() user: JwtPayload,
    @Param('id') memberId: string,
  ) {
    return this.usersService.reactivateMember(user, memberId);
  }
}
