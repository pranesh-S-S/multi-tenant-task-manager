import { Controller, Get, Query } from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { PaginationDto } from '../common/dto/pagination.dto';

/**
 * Activity Logs Controller.
 * All routes are JWT-protected (global guard).
 */
@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  /**
   * GET /activity-logs — List activity logs for the current org (paginated).
   */
  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() pagination: PaginationDto,
  ) {
    return this.activityLogsService.findAll(user, pagination);
  }

  /**
   * GET /activity-logs/entity?type=TASK&id=xxx — Get logs for a specific entity.
   */
  @Get('entity')
  findByEntity(
    @CurrentUser() user: JwtPayload,
    @Query('type') entityType: string,
    @Query('id') entityId: string,
  ) {
    return this.activityLogsService.findByEntity(user, entityType, entityId);
  }
}
