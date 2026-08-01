import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';

export class CreatePermissionGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string; // e.g., "Product", "User", "Category"

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  actions: string[]; // e.g., ["create", "read", "update", "delete", "watch"]
}
