import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateAttributeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsIn(['dropdown', 'radio', 'checkbox', 'colour_swatch', 'image_swatch'])
  type?: string;
}
