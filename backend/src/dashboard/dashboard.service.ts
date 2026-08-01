import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      totalProducts,
      totalCategories,
      totalBrands,
      totalUsers,
      activeProducts,
      draftProducts,
      recentProducts,
      inStockProducts,
      lowStockProducts,
      outOfStockProducts,
      topCategoriesData,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.category.count(),
      this.prisma.brand.count(),
      this.prisma.user.count(),
      this.prisma.product.count({ where: { active: true } }),
      this.prisma.product.count({ where: { active: false } }),
      this.prisma.product.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          brand: { select: { name: true } },
          media: {
            where: { isThumbnail: true },
            include: { media: true },
            take: 1,
          },
        },
      }),
      this.prisma.product.count({ where: { stockStatus: 'in_stock' } }),
      this.prisma.product.count({ where: { stockStatus: 'low_stock' } }),
      this.prisma.product.count({ where: { stockStatus: 'out_of_stock' } }),
      this.prisma.category.findMany({
        select: { name: true, _count: { select: { products: true } } },
        take: 5,
        orderBy: { products: { _count: 'desc' } },
      }),
    ]);

    const productStatusChart = [
      { name: 'Active', value: activeProducts },
      { name: 'Draft', value: draftProducts },
    ];

    const stockStatusChart = [
      { name: 'In Stock', value: inStockProducts },
      { name: 'Low Stock', value: lowStockProducts },
      { name: 'Out of Stock', value: outOfStockProducts },
    ];

    const categoryDistribution = topCategoriesData.map((c) => ({
      name: c.name,
      products: c._count.products,
    }));

    return {
      message: 'Dashboard stats retrieved successfully',
      data: {
        metrics: {
          totalProducts,
          totalCategories,
          totalBrands,
          totalUsers,
        },
        charts: {
          productStatus: productStatusChart,
          stockStatus: stockStatusChart,
          categoryDistribution,
        },
        recentProducts,
      },
    };
  }
}
