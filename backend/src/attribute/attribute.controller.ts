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
import { AttributeService } from './attribute.service';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { AddAttributeValueDto } from './dto/create-attribute-value.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UuidParamDto } from '../common/dto/uuid-param.dto';

@Controller('attributes')
export class AttributeController {
  constructor(private readonly attributeService: AttributeService) {}

  @Post()
  @RequirePermissions('attribute:create')
  create(@Body() dto: CreateAttributeDto) {
    return this.attributeService.create(dto);
  }

  @Get()
  @RequirePermissions('attribute:read')
  findAll(@Query() query: PaginationDto) {
    return this.attributeService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('attribute:read')
  findOne(@Param() params: UuidParamDto) {
    return this.attributeService.findOne(params.id);
  }

  @Patch(':id')
  @RequirePermissions('attribute:update')
  update(@Param() params: UuidParamDto, @Body() dto: UpdateAttributeDto) {
    return this.attributeService.update(params.id, dto);
  }

  @Delete(':id')
  @RequirePermissions('attribute:delete')
  remove(@Param() params: UuidParamDto) {
    return this.attributeService.remove(params.id);
  }

  @Post(':id/values')
  @RequirePermissions('attribute:update')
  addValue(@Param() params: UuidParamDto, @Body() dto: AddAttributeValueDto) {
    return this.attributeService.addValue(params.id, dto);
  }

  @Delete(':id/values/:valueId')
  @RequirePermissions('attribute:delete')
  removeValue(
    @Param('id') attributeId: string,
    @Param('valueId') valueId: string,
  ) {
    return this.attributeService.removeValue(attributeId, valueId);
  }
}
