import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CategoryQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  parentId?: string;
}
