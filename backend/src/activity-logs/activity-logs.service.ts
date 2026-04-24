import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityAction, EntityType } from '@prisma/client';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';

interface LogEntry {
  userId: string;
  organizationId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
}

@Injectable()
export class ActivityLogsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create an activity log entry. Called by other services after mutations.
   */
  async log(entry: LogEntry) {
    return this.prisma.activityLog.create({
      data: {
        userId: entry.userId,
        organizationId: entry.organizationId,
        action: entry.action as ActivityAction,
        entityType: entry.entityType as EntityType,
        entityId: entry.entityId,
        metadata: entry.metadata ?? undefined,
      },
    });
  }

  /**
   * Get activity logs for the current organization (paginated, sorted by newest).
   */
  async findAll(user: JwtPayload, pagination: PaginationDto): Promise<PaginatedResponse<any>> {
    const where = { organizationId: user.orgId };

    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        take: pagination.limit,
        skip: pagination.offset,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  /**
   * Get activity logs for a specific entity.
   */
  async findByEntity(
    user: JwtPayload,
    entityType: string,
    entityId: string,
  ) {
    return this.prisma.activityLog.findMany({
      where: {
        organizationId: user.orgId,
        entityType: entityType as EntityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }
}
