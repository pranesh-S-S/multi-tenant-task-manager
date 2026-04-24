import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { PaginationDto } from '../common/dto/pagination.dto';
import { GetTasksDto } from './dto/get-tasks.dto';

/**
 * Tasks Controller.
 * All routes are JWT-protected (global guard).
 * Ownership + tenant checks happen at the service layer.
 */
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  /**
   * POST /tasks — Create a new task.
   */
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user, dto);
  }

  /**
   * GET /tasks — List all tasks (paginated).
   * Can optionally filter by memberId to get tasks assigned to or created by a user.
   */
  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: GetTasksDto,
  ) {
    return this.tasksService.findAll(user, query, query.memberId);
  }

  /**
   * GET /tasks/:id — Get a single task.
   */
  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.tasksService.findOne(user, id);
  }

  /**
   * PATCH /tasks/:id — Update a task.
   */
  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(user, id, dto);
  }

  /**
   * DELETE /tasks/:id — Soft delete a task.
   */
  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.tasksService.remove(user, id);
  }
}
