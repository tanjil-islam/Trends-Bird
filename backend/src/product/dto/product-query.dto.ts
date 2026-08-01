import { IsOptional, IsString, IsBoolean, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Type } from 'class-transformer';

export class ProductQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasVariants?: boolean;

  @IsOptional()
  @IsString()
  stockStatus?: string;
}
