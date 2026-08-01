import 'multer';
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { UpdateMediaDto } from './dto/update-media.dto';
import { MediaQueryDto } from './dto/media-query.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UuidParamDto } from '../common/dto/uuid-param.dto';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @RequirePermissions('media:create')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: any, @CurrentUser('id') userId: string) {
    return this.mediaService.upload(file, userId);
  }

  @Get()
  @RequirePermissions('media:read')
  findAll(@Query() query: MediaQueryDto) {
    return this.mediaService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('media:read')
  findOne(@Param() params: UuidParamDto) {
    return this.mediaService.findOne(params.id);
  }

  @Patch(':id')
  @RequirePermissions('media:update')
  update(@Param() params: UuidParamDto, @Body() dto: UpdateMediaDto) {
    return this.mediaService.update(params.id, dto);
  }

  @Delete(':id')
  @RequirePermissions('media:delete')
  remove(@Param() params: UuidParamDto) {
    return this.mediaService.remove(params.id);
  }
}
