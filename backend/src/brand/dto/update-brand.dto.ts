import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class UpdateBrandDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  logoId?: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
