import { Controller, Get, Patch, Body } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/types/jwt-payload.type';

/**
 * Organizations Controller.
 * All routes are JWT-protected (global guard).
 */
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  /**
   * GET /organizations/current — Get current org details.
   */
  @Get('current')
  findCurrent(@CurrentUser() user: JwtPayload) {
    return this.organizationsService.findCurrent(user);
  }

  /**
   * PATCH /organizations/current — Update org (admin only).
   */
  @Patch('current')
  @Roles('ADMIN')
  update(
    @CurrentUser() user: JwtPayload,
    @Body() data: { name?: string },
  ) {
    return this.organizationsService.update(user, data);
  }
}
