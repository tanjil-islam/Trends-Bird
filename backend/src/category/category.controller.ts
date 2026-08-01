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
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryQueryDto } from './dto/category-query.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { UuidParamDto } from '../common/dto/uuid-param.dto';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @RequirePermissions('category:create')
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Get()
  @RequirePermissions('category:read')
  findAll(@Query() query: CategoryQueryDto) {
    return this.categoryService.findAll(query);
  }

  @Get('tree')
  @RequirePermissions('category:read')
  findTree() {
    return this.categoryService.findTree();
  }

  @Get(':id')
  @RequirePermissions('category:read')
  findOne(@Param() params: UuidParamDto) {
    return this.categoryService.findOne(params.id);
  }

  @Patch(':id')
  @RequirePermissions('category:update')
  update(@Param() params: UuidParamDto, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(params.id, dto);
  }

  @Delete(':id')
  @RequirePermissions('category:delete')
  remove(@Param() params: UuidParamDto) {
    return this.categoryService.remove(params.id);
  }
}
