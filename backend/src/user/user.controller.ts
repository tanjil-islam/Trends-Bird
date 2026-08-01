import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UuidParamDto } from '../common/dto/uuid-param.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @RequirePermissions('user:create')
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Get()
  @RequirePermissions('user:read')
  findAll(@Query() query: PaginationDto) {
    return this.userService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('user:read')
  findOne(@Param() params: UuidParamDto) {
    return this.userService.findOne(params.id);
  }

  @Patch(':id')
  @RequirePermissions('user:update')
  update(
    @Param() params: UuidParamDto,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.userService.update(params.id, dto, currentUserId);
  }

  @Delete(':id')
  @RequirePermissions('user:delete')
  remove(
    @Param() params: UuidParamDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.userService.remove(params.id, currentUserId);
  }
}
