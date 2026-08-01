import { IsString, IsOptional, IsArray } from 'class-validator';

export class UpdatePermissionGroupDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addActions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  removeActions?: string[];
}
