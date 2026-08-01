import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { AddAttributeValueDto } from './dto/create-attribute-value.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class AttributeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAttributeDto) {
    const existing = await this.prisma.attribute.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException(`Attribute '${dto.name}' already exists`);

    const existingSlug = await this.prisma.attribute.findUnique({ where: { slug: dto.slug } });
    if (existingSlug) throw new ConflictException(`Attribute with slug '${dto.slug}' already exists`);

    const attribute = await this.prisma.attribute.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        type: dto.type,
        values: dto.values
          ? {
              create: dto.values.map((v) => ({
                value: v.value,
                slug: v.slug,
                referenceValue: v.referenceValue,
              })),
            }
          : undefined,
      },
      include: { values: true },
    });

    return { message: 'Attribute created successfully', data: attribute };
  }

  async findAll(query: PaginationDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where = search
      ? { name: { contains: search} }
      : {};

    const [attributes, total] = await Promise.all([
      this.prisma.attribute.findMany({
        where,
        include: { values: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.attribute.count({ where }),
    ]);

    return {
      data: attributes,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const attribute = await this.prisma.attribute.findUnique({
      where: { id },
      include: { values: true },
    });
    if (!attribute) throw new NotFoundException('Attribute not found');
    return attribute;
  }

  async update(id: string, dto: UpdateAttributeDto) {
    await this.findOne(id);

    if (dto.name) {
      const existing = await this.prisma.attribute.findFirst({ where: { name: dto.name, NOT: { id } } });
      if (existing) throw new ConflictException(`Attribute '${dto.name}' already exists`);
    }

    if (dto.slug) {
      const existing = await this.prisma.attribute.findFirst({ where: { slug: dto.slug, NOT: { id } } });
      if (existing) throw new ConflictException(`Attribute with slug '${dto.slug}' already exists`);
    }

    const updated = await this.prisma.attribute.update({
      where: { id },
      data: dto,
      include: { values: true },
    });

    return { message: 'Attribute updated successfully', data: updated };
  }

  async remove(id: string) {
    const attribute = await this.prisma.attribute.findUnique({
      where: { id },
      include: {
        values: {
          include: { _count: { select: { variantValues: true } } },
        },
      },
    });
    if (!attribute) throw new NotFoundException('Attribute not found');

    const usedValues = attribute.values.filter((v) => v._count.variantValues > 0);
    if (usedValues.length > 0) {
      throw new ConflictException(
        `Cannot delete attribute: ${usedValues.length} value(s) are used in product variants.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.attributeValue.deleteMany({ where: { attributeId: id } });
      await tx.attribute.delete({ where: { id } });
    });

    return { message: 'Attribute deleted successfully' };
  }

  // Attribute Value operations
  async addValue(attributeId: string, dto: AddAttributeValueDto) {
    await this.findOne(attributeId);

    const existing = await this.prisma.attributeValue.findFirst({
      where: { attributeId, slug: dto.slug },
    });
    if (existing) throw new ConflictException(`Value with slug '${dto.slug}' already exists for this attribute`);

    const value = await this.prisma.attributeValue.create({
      data: {
        ...dto,
        attributeId,
      },
    });

    return { message: 'Attribute value added successfully', data: value };
  }

  async removeValue(attributeId: string, valueId: string) {
    const value = await this.prisma.attributeValue.findFirst({
      where: { id: valueId, attributeId },
      include: { _count: { select: { variantValues: true } } },
    });
    if (!value) throw new NotFoundException('Attribute value not found');

    if (value._count.variantValues > 0) {
      throw new ConflictException(
        `Cannot delete value: it is used in ${value._count.variantValues} variant(s).`,
      );
    }

    await this.prisma.attributeValue.delete({ where: { id: valueId } });
    return { message: 'Attribute value deleted successfully' };
  }
}
