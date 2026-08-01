import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany();
  const brands = await prisma.brand.findMany();
  const mediaList = await prisma.media.findMany();
  const attributes = await prisma.attribute.findMany({
    include: { values: true }
  });

  const sizeAttr = attributes.find(a => a.name === 'Size');
  const colorAttr = attributes.find(a => a.name === 'Color');

  const getCat = (name: string) => categories.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
  const getBrand = (name: string) => brands.find(b => b.name.toLowerCase().includes(name.toLowerCase()));
  const getMedia = (name: string) => mediaList.find(m => m.fileName.toLowerCase().includes(name.toLowerCase()));

  const productsToCreate = [
    {
      name: 'Adidas Ultraboost 22',
      slug: 'adidas-ultraboost-22',
      sku: 'ADI-UB22-001',
      shortDescription: 'Responsive running shoes.',
      hasVariants: true,
      brand: getBrand('adidas'),
      category: getCat('shoes'),
      media: getMedia('shoes'),
      variants: [
        { size: 'Medium', color: 'Black', sku: 'ADI-UB22-M-BLK', price: 180 },
        { size: 'Large', color: 'Black', sku: 'ADI-UB22-L-BLK', price: 180 },
        { size: 'Large', color: 'White', sku: 'ADI-UB22-L-WHT', price: 180 }
      ]
    },
    {
      name: 'Samsung Galaxy S24 Ultra',
      slug: 'samsung-galaxy-s24-ultra',
      sku: 'SAM-S24U-001',
      shortDescription: 'The ultimate Galaxy experience.',
      hasVariants: false,
      price: 1299.99,
      brand: getBrand('samsung'),
      category: getCat('smartphones'),
      media: getMedia('product') // any product image
    },
    {
      name: 'Puma Classics Logo Hoodie',
      slug: 'puma-classics-logo-hoodie',
      sku: 'PMA-HD-001',
      shortDescription: 'Comfortable everyday hoodie.',
      hasVariants: true,
      brand: getBrand('puma'),
      category: getCat('shirts'),
      media: getMedia('shirt'),
      variants: [
        { size: 'Small', color: 'Red', sku: 'PMA-HD-S-RED', price: 55 },
        { size: 'Medium', color: 'Red', sku: 'PMA-HD-M-RED', price: 55 },
        { size: 'Large', color: 'Blue', sku: 'PMA-HD-L-BLU', price: 55 }
      ]
    },
    {
      name: 'Apple Watch Series 9',
      slug: 'apple-watch-series-9',
      sku: 'APL-AW9-001',
      shortDescription: 'Smarter. Brighter. Mightier.',
      hasVariants: false,
      price: 399.00,
      salePrice: 349.00,
      brand: getBrand('apple'),
      category: getCat('wearables'),
      media: getMedia('watch')
    },
    {
      name: 'Summer Floral Maxi Dress',
      slug: 'summer-floral-maxi-dress',
      sku: 'DRS-FLR-001',
      shortDescription: 'Lightweight summer dress perfect for the beach.',
      hasVariants: true,
      brand: null,
      category: getCat('dresses'),
      media: getMedia('dress'),
      variants: [
        { size: 'Small', color: 'Green', sku: 'DRS-FLR-S-GRN', price: 89 },
        { size: 'Medium', color: 'Green', sku: 'DRS-FLR-M-GRN', price: 89 }
      ]
    },
    {
      name: 'Classic Aviator Sunglasses',
      slug: 'classic-aviator-sunglasses',
      sku: 'ACC-AVT-001',
      shortDescription: 'Timeless aviator design with UV protection.',
      hasVariants: false,
      price: 120.00,
      brand: null,
      category: getCat('men'),
      media: getMedia('sunglasses')
    },
    {
      name: 'Heavyweight Winter Coat',
      slug: 'heavyweight-winter-coat',
      sku: 'WNT-COT-001',
      shortDescription: 'Stay warm in sub-zero temperatures.',
      hasVariants: true,
      brand: null,
      category: getCat('men'),
      media: getMedia('jacket'),
      variants: [
        { size: 'Large', color: 'Black', sku: 'WNT-COT-L-BLK', price: 250 },
        { size: 'X-Large', color: 'Black', sku: 'WNT-COT-XL-BLK', price: 250 }
      ]
    }
  ];

  for (const prod of productsToCreate) {
    try {
      const p = await prisma.product.create({
        data: {
          name: prod.name,
          slug: prod.slug,
          sku: prod.sku,
          shortDescription: prod.shortDescription,
          hasVariants: prod.hasVariants,
          price: prod.price || null,
          salePrice: prod.salePrice || null,
          stock: prod.hasVariants ? null : Math.floor(Math.random() * 50) + 10,
          stockStatus: 'in_stock',
          active: true,
          brandId: prod.brand?.id || null,
          categories: prod.category ? {
            create: [{ categoryId: prod.category.id }]
          } : undefined
        }
      });

      if (prod.media) {
        await prisma.productMedia.create({
          data: {
            productId: p.id,
            mediaId: prod.media.id,
            isThumbnail: true,
            isGallery: true
          }
        });
      }

      if (prod.hasVariants && prod.variants) {
        for (const vData of prod.variants) {
          const sVal = sizeAttr?.values.find(v => v.value === vData.size);
          const cVal = colorAttr?.values.find(v => v.value === vData.color);

          if (sVal && cVal) {
            await prisma.productVariant.create({
              data: {
                productId: p.id,
                sku: vData.sku,
                price: vData.price,
                stock: Math.floor(Math.random() * 30) + 5,
                stockStatus: 'in_stock',
                attributeValues: {
                  create: [
                    { attributeValueId: sVal.id },
                    { attributeValueId: cVal.id }
                  ]
                }
              }
            });
          }
        }
      }
      console.log(`Seeded Product: ${prod.name}`);
    } catch (e) {
      console.log(`Skipped ${prod.name} - likely already exists.`);
    }
  }

  console.log('More products seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
