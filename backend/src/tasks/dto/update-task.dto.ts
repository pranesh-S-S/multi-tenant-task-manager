import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';

/**
 * Update task DTO — all fields are optional (partial update).
 * Inherits all validation rules from CreateTaskDto.
 */
export class UpdateTaskDto extends PartialType(CreateTaskDto) {}
