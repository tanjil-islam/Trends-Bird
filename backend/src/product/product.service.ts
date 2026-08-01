import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    // Validate slug uniqueness
    const existingSlug = await this.prisma.product.findUnique({ where: { slug: dto.slug } });
    if (existingSlug) throw new ConflictException(`Product with slug '${dto.slug}' already exists`);

    const existingSku = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
    if (existingSku) throw new ConflictException(`Product with SKU '${dto.sku}' already exists`);

    // Conditional validation based on hasVariants
    if (dto.hasVariants) {
      if (dto.price !== undefined || dto.salePrice !== undefined || dto.stock !== undefined) {
        throw new BadRequestException('Variable products should not have price, salePrice, or stock at the product level. Set these on variants.');
      }
      if (!dto.variants || dto.variants.length === 0) {
        throw new BadRequestException('Variable products must have at least one variant');
      }
    } else {
      if (dto.variants && dto.variants.length > 0) {
        throw new BadRequestException('Simple products cannot have variants');
      }
      if (dto.price === undefined) {
        throw new BadRequestException('Simple products must have a price');
      }
    }

    // Validate sale price < price for simple products
    if (!dto.hasVariants && dto.salePrice !== undefined && dto.price !== undefined) {
      if (dto.salePrice >= dto.price) {
        throw new BadRequestException('Sale price must be less than the regular price');
      }
    }

    // Validate variant SKU uniqueness and sale price
    if (dto.variants) {
      const variantSkus = dto.variants.map(v => v.sku);
      // Check against product SKU
      if (variantSkus.includes(dto.sku)) {
        throw new BadRequestException('Variant SKU cannot be the same as the product SKU');
      }
      // Check for duplicate variant SKUs within request
      const uniqueSkus = new Set(variantSkus);
      if (uniqueSkus.size !== variantSkus.length) {
        throw new BadRequestException('Duplicate SKUs found among variants');
      }
      // Check for duplicate variant SKUs in database
      const existingVariantSkus = await this.prisma.productVariant.findMany({
        where: { sku: { in: variantSkus } },
        select: { sku: true },
      });
      if (existingVariantSkus.length > 0) {
        throw new ConflictException(`Variant SKU(s) already exist: ${existingVariantSkus.map(v => v.sku).join(', ')}`);
      }

      // Validate sale price < price for each variant
      for (const variant of dto.variants) {
        if (variant.salePrice !== undefined && variant.salePrice >= variant.price) {
          throw new BadRequestException(`Variant '${variant.sku}': sale price must be less than the regular price`);
        }
      }

      // Check for duplicate attribute combinations
      this.validateUniqueAttributeCombinations(dto.variants);
    }

    // Validate thumbnail: only one thumbnail allowed
    if (dto.media) {
      const thumbnails = dto.media.filter(m => m.isThumbnail);
      if (thumbnails.length > 1) {
        throw new BadRequestException('Only one thumbnail is allowed per product. The latest will be used.');
      }
    }

    // Execute in atomic transaction
    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          sku: dto.sku,
          shortDescription: dto.shortDescription,
          longDescription: dto.longDescription,
          hasVariants: dto.hasVariants,
          price: dto.hasVariants ? null : dto.price,
          salePrice: dto.hasVariants ? null : dto.salePrice,
          stock: dto.hasVariants ? null : (dto.stock ?? 0),
          stockStatus: dto.hasVariants ? null : (dto.stockStatus || 'in_stock'),
          weight: dto.weight,
          active: dto.active ?? true,
          featured: dto.featured ?? false,
          sortOrder: dto.sortOrder ?? 0,
          brandId: dto.brandId,
        },
      });

      // Attach categories
      if (dto.categoryIds && dto.categoryIds.length > 0) {
        await tx.productCategory.createMany({
          data: dto.categoryIds.map(categoryId => ({
            productId: created.id,
            categoryId,
          })),
        });
      }

      // Create variants
      if (dto.variants && dto.variants.length > 0) {
        for (const variantDto of dto.variants) {
          const variant = await tx.productVariant.create({
            data: {
              productId: created.id,
              sku: variantDto.sku,
              price: variantDto.price,
              salePrice: variantDto.salePrice,
              stock: variantDto.stock ?? 0,
              stockStatus: variantDto.stockStatus || 'in_stock',
              lowStockThreshold: variantDto.lowStockThreshold ?? 5,
              weight: variantDto.weight,
              active: variantDto.active ?? true,
            },
          });

          // Attach attribute values to variant
          if (variantDto.attributeValues && variantDto.attributeValues.length > 0) {
            await tx.variantAttributeValue.createMany({
              data: variantDto.attributeValues.map(av => ({
                variantId: variant.id,
                attributeValueId: av.attributeValueId,
              })),
            });
          }
          
          // Attach variant media
          if (variantDto.media && variantDto.media.length > 0) {
            for (const mediaDto of variantDto.media) {
              await tx.productMedia.create({
                data: {
                  productId: created.id,
                  variantId: variant.id,
                  mediaId: mediaDto.mediaId,
                  isThumbnail: mediaDto.isThumbnail ?? false,
                  isGallery: mediaDto.isGallery ?? true,
                  sortOrder: mediaDto.sortOrder ?? 0,
                  attributeValueId: mediaDto.attributeValueId,
                },
              });
            }
          }
        }
      }

      // Attach media
      if (dto.media && dto.media.length > 0) {
        // Demote existing thumbnails if a new one is being set
        const thumbnailMedia = dto.media.find(m => m.isThumbnail);
        
        for (const mediaDto of dto.media) {
          await tx.productMedia.create({
            data: {
              productId: created.id,
              mediaId: mediaDto.mediaId,
              isThumbnail: mediaDto.isThumbnail ?? false,
              isGallery: mediaDto.isGallery ?? true,
              sortOrder: mediaDto.sortOrder ?? 0,
              attributeValueId: mediaDto.attributeValueId,
            },
          });
        }
      }

      return created;
    });

    // Fetch and return the full product
    return {
      message: 'Product created successfully',
      data: await this.getFullProduct(product.id),
    };
  }

  async findAll(query: ProductQueryDto) {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc',
      brandId, categoryId, active, featured, hasVariants, stockStatus } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search} },
        { slug: { contains: search} },
        { sku: { contains: search} },
      ];
    }
    if (brandId) where.brandId = brandId;
    if (active !== undefined) where.active = active;
    if (featured !== undefined) where.featured = featured;
    if (hasVariants !== undefined) where.hasVariants = hasVariants;
    if (stockStatus) where.stockStatus = stockStatus;
    if (categoryId) {
      where.categories = { some: { categoryId } };
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          brand: { select: { id: true, name: true } },
          categories: {
            include: { category: { select: { id: true, name: true, slug: true } } },
          },
          media: {
            where: { isThumbnail: true },
            include: { media: true },
            take: 1,
          },
          variants: {
            select: { price: true, salePrice: true },
          },
          _count: { select: { variants: true } },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Add price range for variable products
    const productsWithPriceRange = products.map((product) => {
      if (product.hasVariants && product.variants.length > 0) {
        const prices = product.variants.map(v => Number(v.price));
        const salePrices = product.variants
          .filter(v => v.salePrice)
          .map(v => Number(v.salePrice));

        return {
          ...product,
          priceRange: {
            min: Math.min(...prices),
            max: Math.max(...prices),
            minSalePrice: salePrices.length > 0 ? Math.min(...salePrices) : null,
            maxSalePrice: salePrices.length > 0 ? Math.max(...salePrices) : null,
          },
        };
      }
      return { ...product, priceRange: null };
    });

    return {
      data: productsWithPriceRange,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const product = await this.getFullProduct(id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');

    if (dto.slug) {
      const slugExists = await this.prisma.product.findFirst({ where: { slug: dto.slug, NOT: { id } } });
      if (slugExists) throw new ConflictException(`Product with slug '${dto.slug}' already exists`);
    }

    if (dto.sku) {
      const skuExists = await this.prisma.product.findFirst({ where: { sku: dto.sku, NOT: { id } } });
      if (skuExists) throw new ConflictException(`Product with SKU '${dto.sku}' already exists`);
    }

    // Validate sale price
    const effectivePrice = dto.price ?? Number(existing.price);
    if (dto.salePrice !== undefined && effectivePrice && dto.salePrice >= effectivePrice) {
      throw new BadRequestException('Sale price must be less than the regular price');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update base product
      const productData: any = {};
      if (dto.name !== undefined) productData.name = dto.name;
      if (dto.slug !== undefined) productData.slug = dto.slug;
      if (dto.sku !== undefined) productData.sku = dto.sku;
      if (dto.shortDescription !== undefined) productData.shortDescription = dto.shortDescription;
      if (dto.longDescription !== undefined) productData.longDescription = dto.longDescription;
      if (dto.hasVariants !== undefined) productData.hasVariants = dto.hasVariants;
      if (dto.price !== undefined) productData.price = dto.price;
      if (dto.salePrice !== undefined) productData.salePrice = dto.salePrice;
      if (dto.stock !== undefined) productData.stock = dto.stock;
      if (dto.stockStatus !== undefined) productData.stockStatus = dto.stockStatus;
      
      const isNowVariable = dto.hasVariants !== undefined ? dto.hasVariants : existing.hasVariants;
      if (isNowVariable) {
        productData.price = null;
        productData.salePrice = null;
        productData.stock = null;
        productData.stockStatus = null;
      }

      if (dto.weight !== undefined) productData.weight = dto.weight;
      if (dto.active !== undefined) productData.active = dto.active;
      if (dto.featured !== undefined) productData.featured = dto.featured;
      if (dto.sortOrder !== undefined) productData.sortOrder = dto.sortOrder;
      if (dto.brandId !== undefined) productData.brandId = dto.brandId;

      await tx.product.update({ where: { id }, data: productData });

      // Update categories
      if (dto.categoryIds) {
        await tx.productCategory.deleteMany({ where: { productId: id } });
        if (dto.categoryIds.length > 0) {
          await tx.productCategory.createMany({
            data: dto.categoryIds.map(categoryId => ({
              productId: id,
              categoryId,
            })),
          });
        }
      }

      // Update media
      if (dto.media) {
        await tx.productMedia.deleteMany({ where: { productId: id } });
        for (const mediaDto of dto.media) {
          await tx.productMedia.create({
            data: {
              productId: id,
              mediaId: mediaDto.mediaId,
              isThumbnail: mediaDto.isThumbnail ?? false,
              isGallery: mediaDto.isGallery ?? true,
              sortOrder: mediaDto.sortOrder ?? 0,
              attributeValueId: mediaDto.attributeValueId,
            },
          });
        }
      }

      // Update variants
      if (!isNowVariable) {
        // Changing to Simple (or staying simple), delete any existing variants
        await tx.variantAttributeValue.deleteMany({
          where: { variant: { productId: id } },
        });
        await tx.productVariant.deleteMany({ where: { productId: id } });
      }

      if (dto.variants && isNowVariable) {
        // Validate variant SKUs
        for (const variant of dto.variants) {
          if (variant.salePrice !== undefined && variant.salePrice >= variant.price) {
            throw new BadRequestException(`Variant '${variant.sku}': sale price must be less than regular price`);
          }
        }
        this.validateUniqueAttributeCombinations(dto.variants);

        // Delete existing variants and recreate
        await tx.variantAttributeValue.deleteMany({
          where: { variant: { productId: id } },
        });
        await tx.productVariant.deleteMany({ where: { productId: id } });

        for (const variantDto of dto.variants) {
          const variant = await tx.productVariant.create({
            data: {
              productId: id,
              sku: variantDto.sku,
              price: variantDto.price,
              salePrice: variantDto.salePrice,
              stock: variantDto.stock ?? 0,
              stockStatus: variantDto.stockStatus || 'in_stock',
              lowStockThreshold: variantDto.lowStockThreshold ?? 5,
              weight: variantDto.weight,
              active: variantDto.active ?? true,
            },
          });

          if (variantDto.attributeValues && variantDto.attributeValues.length > 0) {
            await tx.variantAttributeValue.createMany({
              data: variantDto.attributeValues.map(av => ({
                variantId: variant.id,
                attributeValueId: av.attributeValueId,
              })),
            });
          }
          
          if (variantDto.media && variantDto.media.length > 0) {
            for (const mediaDto of variantDto.media) {
              await tx.productMedia.create({
                data: {
                  productId: id,
                  variantId: variant.id,
                  mediaId: mediaDto.mediaId,
                  isThumbnail: mediaDto.isThumbnail ?? false,
                  isGallery: mediaDto.isGallery ?? true,
                  sortOrder: mediaDto.sortOrder ?? 0,
                  attributeValueId: mediaDto.attributeValueId,
                },
              });
            }
          }
        }
      }

      return tx.product.findUnique({ where: { id } });
    });

    return {
      message: 'Product updated successfully',
      data: await this.getFullProduct(id),
    };
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.productMedia.deleteMany({ where: { productId: id } });
      await tx.productCategory.deleteMany({ where: { productId: id } });
      await tx.variantAttributeValue.deleteMany({
        where: { variant: { productId: id } },
      });
      await tx.productVariant.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });

    return { message: 'Product deleted successfully' };
  }

  private async getFullProduct(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        categories: {
          include: { category: true },
        },
        media: {
          include: {
            media: true,
            attributeValue: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        variants: {
          include: {
            attributeValues: {
              include: {
                attributeValue: {
                  include: { attribute: true },
                },
              },
            },
            media: {
              include: { media: true },
            },
          },
        },
      },
    });
  }

  private validateUniqueAttributeCombinations(variants: { attributeValues: { attributeValueId: string }[] }[]) {
    const combinations = variants.map(v =>
      [...v.attributeValues.map(av => av.attributeValueId)].sort().join(','),
    );

    const uniqueCombinations = new Set(combinations);
    if (uniqueCombinations.size !== combinations.length) {
      throw new BadRequestException('Duplicate attribute combinations found among variants. Each variant must have a unique attribute combination.');
    }
  }
}
