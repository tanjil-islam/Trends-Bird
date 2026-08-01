import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AddAttributeValueDto {
  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsOptional()
  @IsString()
  referenceValue?: string;
}
