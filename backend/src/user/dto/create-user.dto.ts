import { IsString, IsNotEmpty, IsEmail, MinLength, IsOptional, IsBoolean, IsIn, IsUUID } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(['male', 'female', 'other'])
  gender?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsUUID()
  @IsNotEmpty()
  roleId: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
