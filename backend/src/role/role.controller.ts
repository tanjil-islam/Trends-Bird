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
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UuidParamDto } from '../common/dto/uuid-param.dto';

@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @RequirePermissions('role:create')
  create(@Body() dto: CreateRoleDto) {
    return this.roleService.create(dto);
  }

  @Get()
  @RequirePermissions('role:read')
  findAll(@Query() query: PaginationDto) {
    return this.roleService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('role:read')
  findOne(@Param() params: UuidParamDto) {
    return this.roleService.findOne(params.id);
  }

  @Patch(':id')
  @RequirePermissions('role:update')
  update(@Param() params: UuidParamDto, @Body() dto: UpdateRoleDto) {
    return this.roleService.update(params.id, dto);
  }

  @Delete(':id')
  @RequirePermissions('role:delete')
  remove(@Param() params: UuidParamDto) {
    return this.roleService.remove(params.id);
  }

  @Post(':id/grant-all')
  @RequirePermissions('role:update')
  grantAll(@Param() params: UuidParamDto) {
    return this.roleService.grantAllPermissions(params.id);
  }
}
