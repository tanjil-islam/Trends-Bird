import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class BrandService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBrandDto) {
    const existingName = await this.prisma.brand.findUnique({
      where: { name: dto.name },
    });
    if (existingName)
      throw new ConflictException(`Brand '${dto.name}' already exists`);

    const existingSlug = await this.prisma.brand.findUnique({
      where: { slug: dto.slug },
    });
    if (existingSlug)
      throw new ConflictException(
        `Brand with slug '${dto.slug}' already exists`,
      );

    const brand = await this.prisma.brand.create({
      data: dto,
      include: { logo: true },
    });

    return { message: 'Brand created successfully', data: brand };
  }

  async findAll(query: PaginationDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [{ name: { contains: search } }, { slug: { contains: search } }],
        }
      : {};

    const [brands, total] = await Promise.all([
      this.prisma.brand.findMany({
        where,
        include: {
          logo: true,
          _count: { select: { products: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.brand.count({ where }),
    ]);

    return {
      data: brands,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        logo: true,
        _count: { select: { products: true } },
      },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async update(id: string, dto: UpdateBrandDto) {
    await this.findOne(id);

    if (dto.name) {
      const existing = await this.prisma.brand.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (existing)
        throw new ConflictException(`Brand '${dto.name}' already exists`);
    }

    if (dto.slug) {
      const existing = await this.prisma.brand.findFirst({
        where: { slug: dto.slug, NOT: { id } },
      });
      if (existing)
        throw new ConflictException(
          `Brand with slug '${dto.slug}' already exists`,
        );
    }

    const updated = await this.prisma.brand.update({
      where: { id },
      data: dto,
      include: { logo: true },
    });

    return { message: 'Brand updated successfully', data: updated };
  }

  async remove(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!brand) throw new NotFoundException('Brand not found');

    if (brand._count.products > 0) {
      throw new ConflictException(
        `Cannot delete brand: ${brand._count.products} product(s) are using it. Remove products first.`,
      );
    }

    await this.prisma.brand.delete({ where: { id } });
    return { message: 'Brand deleted successfully' };
  }
}
