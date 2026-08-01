import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { slug: dto.slug },
    });
    if (existing)
      throw new ConflictException(
        `Category with slug '${dto.slug}' already exists`,
      );

    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) throw new NotFoundException('Parent category not found');
    }

    const category = await this.prisma.category.create({
      data: dto,
      include: { parent: true, children: true, image: true },
    });

    return { message: 'Category created successfully', data: category };
  }

  async findAll(query: PaginationDto & { parentId?: string }) {
    const { page = 1, limit = 50, search, parentId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
      ];
    }
    // If parentId is 'root', show only top-level categories
    if (parentId === 'root') {
      where.parentId = null;
    } else if (parentId) {
      where.parentId = parentId;
    }

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        include: {
          parent: { select: { id: true, name: true } },
          children: { select: { id: true, name: true, slug: true } },
          image: true,
          _count: { select: { products: true, children: true } },
        },
        skip,
        take: limit,
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      data: categories,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findTree() {
    // Get all categories and build a tree
    const all = await this.prisma.category.findMany({
      include: { image: true, _count: { select: { products: true } } },
      orderBy: { sortOrder: 'asc' },
    });

    const map = new Map<string, any>();
    const roots: any[] = [];

    all.forEach((cat) => {
      map.set(cat.id, { ...cat, children: [] });
    });

    all.forEach((cat) => {
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId).children.push(map.get(cat.id));
      } else {
        roots.push(map.get(cat.id));
      }
    });

    return roots;
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: { include: { image: true } },
        image: true,
        _count: { select: { products: true, children: true } },
      },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);

    if (dto.slug) {
      const existing = await this.prisma.category.findFirst({
        where: { slug: dto.slug, NOT: { id } },
      });
      if (existing)
        throw new ConflictException(
          `Category with slug '${dto.slug}' already exists`,
        );
    }

    // Cycle detection: ensure the new parentId doesn't create a cycle
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }
      await this.detectCycle(id, dto.parentId);
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: dto,
      include: { parent: true, children: true, image: true },
    });

    return { message: 'Category updated successfully', data: updated };
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { children: true, products: true } } },
    });
    if (!category) throw new NotFoundException('Category not found');

    if (category._count.children > 0) {
      throw new ConflictException(
        `Cannot delete category: it has ${category._count.children} subcategory(ies). Delete or reassign them first.`,
      );
    }

    if (category._count.products > 0) {
      throw new ConflictException(
        `Cannot delete category: it is assigned to ${category._count.products} product(s). Remove assignments first.`,
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted successfully' };
  }

  /** Walk up the ancestor chain from targetParentId. If we ever reach `categoryId`, it's a cycle. */
  private async detectCycle(
    categoryId: string,
    targetParentId: string,
  ): Promise<void> {
    const visited = new Set<string>();
    let currentId: string | null = targetParentId;

    while (currentId) {
      if (currentId === categoryId) {
        throw new BadRequestException(
          'Setting this parent would create a cycle in the category tree',
        );
      }
      if (visited.has(currentId)) break; // safety check
      visited.add(currentId);

      const parent = await this.prisma.category.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });
      currentId = parent?.parentId || null;
    }
  }
}
