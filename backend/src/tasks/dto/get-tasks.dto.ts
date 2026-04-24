import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class GetTasksDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @IsUUID()
  memberId?: string;
}
