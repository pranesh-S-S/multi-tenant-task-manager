import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { withTenantScope } from '../common/helpers/tenant.helper';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { Task } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private activityLogs: ActivityLogsService,
  ) {}

  /**
   * Create a new task in the user's organization.
   */
  async create(user: JwtPayload, dto: CreateTaskDto): Promise<Task> {
    // Validate assignees belong to same org
    if (dto.assigneeIds && dto.assigneeIds.length > 0) {
      await this.validateAssignees(user.orgId, dto.assigneeIds);
    }

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        status: dto.status,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        organizationId: user.orgId,
        createdById: user.sub,
        assignees: dto.assigneeIds && dto.assigneeIds.length > 0
          ? { connect: dto.assigneeIds.map(id => ({ id })) }
          : undefined,
      },
    });

    // Log activity
    await this.activityLogs.log({
      userId: user.sub,
      organizationId: user.orgId,
      action: 'CREATE_TASK',
      entityType: 'TASK',
      entityId: task.id,
      metadata: { title: task.title, priority: task.priority },
    });

    return task;
  }

  /**
   * Find all tasks in the user's organization (paginated).
   * Optionally filter by memberId.
   */
  async findAll(
    user: JwtPayload,
    pagination: PaginationDto,
    memberId?: string,
  ): Promise<PaginatedResponse<Task>> {
    let where: any = { ...withTenantScope(user) };
    if (memberId) {
      where = {
        ...where,
        OR: [
          { createdById: memberId },
          { assignees: { some: { id: memberId } } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        take: pagination.limit,
        skip: pagination.offset,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          assignees: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.task.count({ where }),
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
   * Find a single task by ID (tenant-scoped).
   */
  async findOne(user: JwtPayload, taskId: string): Promise<Task> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, ...withTenantScope(user) },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assignees: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  /**
   * Update a task (fetch-first-then-update pattern).
   * Authorization rules:
   *   - ADMIN: can update any field on any task (including assignee)
   *   - ASSIGNEE: can update status, priority, description, dueDate (NOT assignee)
   *   - CREATOR: can update their own tasks (NOT assignee)
   *   - Others: forbidden
   */
  async update(
    user: JwtPayload,
    taskId: string,
    dto: UpdateTaskDto,
  ): Promise<Task> {
    // Step 1: Fetch with tenant scope
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, ...withTenantScope(user) },
      include: { assignees: { select: { id: true } } },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const isAdmin = user.role === 'ADMIN';
    const isCreator = task.createdById === user.sub;
    const isAssignee = task.assignees.some(a => a.id === user.sub);

    // Step 2: Authorization check — must be admin, creator, or assignee
    if (!isAdmin && !isCreator && !isAssignee) {
      throw new ForbiddenException(
        'Only the admin, task creator, or assignee can update this task',
      );
    }

    // Step 3: Only admins can change the assignees
    if (dto.assigneeIds !== undefined && !isAdmin) {
      throw new ForbiddenException(
        'Only admins can change the task assignees',
      );
    }

    // Step 3.5: Only admins and creators can edit the description
    if (dto.description !== undefined && !isAdmin && !isCreator) {
      throw new ForbiddenException(
        'Only the admin or task creator can edit the description',
      );
    }

    // Step 4: Validate new assignees belong to same org
    if (dto.assigneeIds && dto.assigneeIds.length > 0) {
      await this.validateAssignees(user.orgId, dto.assigneeIds);
    }

    // Step 5: Update by unique ID (safe — tenant + auth verified)
    const dataToUpdate: any = {
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    };
    
    // Prisma requires separate connect/disconnect for arrays, or set
    if (dto.assigneeIds !== undefined) {
      delete dataToUpdate.assigneeIds;
      dataToUpdate.assignees = { set: dto.assigneeIds.map(id => ({ id })) };
    }

    const updated = await this.prisma.task.update({
      where: { id: task.id },
      data: dataToUpdate,
    });

    // Step 6: Log activity
    await this.activityLogs.log({
      userId: user.sub,
      organizationId: user.orgId,
      action: 'UPDATE_TASK',
      entityType: 'TASK',
      entityId: taskId,
      metadata: {
        changes: dto,
        updatedBy: isAdmin ? 'admin' : isAssignee ? 'assignee' : 'creator',
      },
    });

    return updated;
  }

  /**
   * Soft delete a task.
   * Only admins can delete tasks.
   */
  async remove(user: JwtPayload, taskId: string): Promise<Task> {
    // Step 1: Fetch with tenant scope
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, ...withTenantScope(user) },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Step 2: Ownership check
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can delete tasks');
    }

    // Step 3: Soft delete
    const deleted = await this.prisma.task.update({
      where: { id: task.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    // Step 4: Log activity
    await this.activityLogs.log({
      userId: user.sub,
      organizationId: user.orgId,
      action: 'DELETE_TASK',
      entityType: 'TASK',
      entityId: taskId,
      metadata: { title: task.title },
    });

    return deleted;
  }

  /**
   * Validate that the assignee exists and belongs to the same organization.
   * Prevents cross-tenant task assignment.
   */
  private async validateAssignees(orgId: string, assigneeIds: string[]) {
    const assignees = await this.prisma.user.findMany({
      where: {
        id: { in: assigneeIds },
        organizationId: orgId,
        isActive: true,
      },
    });

    if (assignees.length !== assigneeIds.length) {
      throw new BadRequestException(
        'One or more assignees not found or do not belong to your organization',
      );
    }
  }
}
