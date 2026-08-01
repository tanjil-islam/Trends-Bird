import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(file: any, userId: string) {
    if (!file) throw new BadRequestException('No file uploaded');

    let type = 'document';
    if (file.mimetype.startsWith('image/')) type = 'image';
    else if (file.mimetype.startsWith('video/')) type = 'video';

    let width: number | null = null;
    let height: number | null = null;
    let thumbnailPath: string | null = null;

    // Generate thumbnail and get dimensions for images
    if (type === 'image' && !file.mimetype.includes('svg')) {
      try {
        const metadata = await sharp(file.path).metadata();
        width = metadata.width || null;
        height = metadata.height || null;

        // Generate thumbnail
        const thumbName = `thumb_${path.basename(file.filename)}`;
        const thumbFullPath = path.join(path.dirname(file.path), thumbName);
        await sharp(file.path)
          .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
          .toFile(thumbFullPath);
        thumbnailPath = `/uploads/${thumbName}`;
      } catch (e) {
        // If sharp fails, just skip thumbnail
      }
    }

    const media = await this.prisma.media.create({
      data: {
        fileName: file.originalname,
        storedPath: file.path,
        publicUrl: `/uploads/${file.filename}`,
        mimeType: file.mimetype,
        type,
        size: file.size,
        width,
        height,
        thumbnail: thumbnailPath,
        uploadedById: userId,
      },
    });

    return { message: 'File uploaded successfully', data: media };
  }

  async findAll(query: PaginationDto & { type?: string }) {
    const { page = 1, limit = 20, search, type } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { fileName: { contains: search } },
        { title: { contains: search } },
      ];
    }
    if (type) where.type = type;

    const [media, total] = await Promise.all([
      this.prisma.media.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { uploadedBy: { select: { id: true, name: true } } },
      }),
      this.prisma.media.count({ where }),
    ]);

    return {
      data: media,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const media = await this.prisma.media.findUnique({
      where: { id },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
    if (!media) throw new NotFoundException('Media not found');
    return media;
  }

  async update(id: string, data: { altText?: string; title?: string }) {
    await this.findOne(id);
    return this.prisma.media.update({ where: { id }, data });
  }

  async remove(id: string) {
    const media = await this.prisma.media.findUnique({
      where: { id },
      include: {
        productMedia: true,
        categoryImages: true,
        brandLogos: true,
      },
    });
    if (!media) throw new NotFoundException('Media not found');

    if (
      media.productMedia.length > 0 ||
      media.categoryImages.length > 0 ||
      media.brandLogos.length > 0
    ) {
      throw new ConflictException(
        'Cannot delete media: it is in use by products, categories, or brands. Remove references first.',
      );
    }

    // Delete files from disk
    try {
      if (fs.existsSync(media.storedPath)) fs.unlinkSync(media.storedPath);
      if (media.thumbnail) {
        const thumbPath = path.join(process.cwd(), media.thumbnail);
        if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
      }
    } catch (e) {
      /* ignore file deletion errors */
    }

    await this.prisma.media.delete({ where: { id } });
    return { message: 'Media deleted successfully' };
  }
}
