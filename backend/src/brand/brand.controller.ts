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
import { BrandService } from './brand.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UuidParamDto } from '../common/dto/uuid-param.dto';

@Controller('brands')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Post()
  @RequirePermissions('brand:create')
  create(@Body() dto: CreateBrandDto) {
    return this.brandService.create(dto);
  }

  @Get()
  @RequirePermissions('brand:read')
  findAll(@Query() query: PaginationDto) {
    return this.brandService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('brand:read')
  findOne(@Param() params: UuidParamDto) {
    return this.brandService.findOne(params.id);
  }

  @Patch(':id')
  @RequirePermissions('brand:update')
  update(@Param() params: UuidParamDto, @Body() dto: UpdateBrandDto) {
    return this.brandService.update(params.id, dto);
  }

  @Delete(':id')
  @RequirePermissions('brand:delete')
  remove(@Param() params: UuidParamDto) {
    return this.brandService.remove(params.id);
  }
}
