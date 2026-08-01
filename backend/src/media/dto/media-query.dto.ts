import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class MediaQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  type?: string;
}
