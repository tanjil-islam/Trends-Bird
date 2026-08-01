import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { UuidParamDto } from '../common/dto/uuid-param.dto';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @RequirePermissions('product:create')
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Get()
  @RequirePermissions('product:read')
  findAll(@Query() query: ProductQueryDto) {
    return this.productService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('product:read')
  findOne(@Param() params: UuidParamDto) {
    return this.productService.findOne(params.id);
  }

  @Patch(':id')
  @RequirePermissions('product:update')
  update(@Param() params: UuidParamDto, @Body() dto: UpdateProductDto) {
    return this.productService.update(params.id, dto);
  }

  @Delete(':id')
  @RequirePermissions('product:delete')
  remove(@Param() params: UuidParamDto) {
    return this.productService.remove(params.id);
  }
}
