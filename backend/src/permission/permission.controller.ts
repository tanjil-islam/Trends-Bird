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
import { PermissionService } from './permission.service';
import { CreatePermissionGroupDto } from './dto/create-permission-group.dto';
import { UpdatePermissionGroupDto } from './dto/update-permission-group.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UuidParamDto } from '../common/dto/uuid-param.dto';

@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  @RequirePermissions('permission:create')
  create(@Body() dto: CreatePermissionGroupDto) {
    return this.permissionService.createGroup(dto);
  }

  @Get()
  @RequirePermissions('permission:read')
  findAll(@Query() query: PaginationDto) {
    return this.permissionService.findAll(query);
  }

  @Get('flat')
  @RequirePermissions('permission:read')
  findAllFlat() {
    return this.permissionService.findAllFlat();
  }

  @Get(':id')
  @RequirePermissions('permission:read')
  findOne(@Param() params: UuidParamDto) {
    return this.permissionService.findOne(params.id);
  }

  @Patch(':id')
  @RequirePermissions('permission:update')
  update(@Param() params: UuidParamDto, @Body() dto: UpdatePermissionGroupDto) {
    return this.permissionService.update(params.id, dto);
  }

  @Delete(':id')
  @RequirePermissions('permission:delete')
  remove(@Param() params: UuidParamDto) {
    return this.permissionService.remove(params.id);
  }
}
