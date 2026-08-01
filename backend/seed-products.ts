import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.productCategory.deleteMany();
  await prisma.productMedia.deleteMany();
  await prisma.variantAttributeValue.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();

  // Fetch some needed relations
  const categories = await prisma.category.findMany();
  const brands = await prisma.brand.findMany();
  const mediaList = await prisma.media.findMany({ take: 10 });
  const attributes = await prisma.attribute.findMany({
    include: { values: true }
  });

  const sizeAttr = attributes.find(a => a.name === 'Size');
  const colorAttr = attributes.find(a => a.name === 'Color');

  const mensCat = categories.find(c => c.name === "Men's Fashion" || c.name === "Shirts");
  const electronicsCat = categories.find(c => c.name === "Electronics" || c.name === "Smartphones");
  const nikeBrand = brands.find(b => b.name === "Nike");
  const appleBrand = brands.find(b => b.name === "Apple");

  // --- Product 1: Simple Product (No variants) ---
  if (electronicsCat && appleBrand) {
    const p1 = await prisma.product.create({
      data: {
        name: 'iPhone 15 Pro Max',
        slug: 'iphone-15-pro-max',
        sku: 'APL-IPH-15PM',
        shortDescription: 'The ultimate iPhone.',
        longDescription: 'Features a titanium design, A17 Pro chip, Action button, and more.',
        hasVariants: false,
        price: 1199.00,
        stock: 50,
        stockStatus: 'in_stock',
        active: true,
        featured: true,
        brandId: appleBrand.id,
        categories: {
          create: [{ categoryId: electronicsCat.id }]
        },
      }
    });
    
    // Add media
    if (mediaList[0]) {
      await prisma.productMedia.create({
        data: {
          productId: p1.id,
          mediaId: mediaList[0].id,
          isThumbnail: true,
          isGallery: true
        }
      });
    }
    console.log(`Seeded Simple Product: ${p1.name}`);
  }

  // --- Product 2: Complex Product (With Variants) ---
  if (mensCat && nikeBrand && sizeAttr && colorAttr) {
    const p2 = await prisma.product.create({
      data: {
        name: 'Nike Dri-FIT Running Tee',
        slug: 'nike-dri-fit-running-tee',
        sku: 'NKE-DFT-001',
        shortDescription: 'Breathable running t-shirt.',
        longDescription: 'Stay dry and comfortable with Nike Dri-FIT technology.',
        hasVariants: true,
        price: null, // Price is defined on variants
        stock: null, // Stock is defined on variants
        active: true,
        brandId: nikeBrand.id,
        categories: {
          create: [{ categoryId: mensCat.id }]
        }
      }
    });

    const sizeM = sizeAttr.values.find(v => v.value === 'Medium');
    const sizeL = sizeAttr.values.find(v => v.value === 'Large');
    const colorRed = colorAttr.values.find(v => v.value === 'Red');
    const colorBlue = colorAttr.values.find(v => v.value === 'Blue');

    const combos = [
      { s: sizeM, c: colorRed, sku: 'NKE-DFT-001-M-R', price: 35 },
      { s: sizeM, c: colorBlue, sku: 'NKE-DFT-001-M-B', price: 35 },
      { s: sizeL, c: colorRed, sku: 'NKE-DFT-001-L-R', price: 40 },
    ];

    for (const combo of combos) {
      if (combo.s && combo.c) {
        const v = await prisma.productVariant.create({
          data: {
            productId: p2.id,
            sku: combo.sku,
            price: combo.price,
            stock: 20,
            stockStatus: 'in_stock',
            attributeValues: {
              create: [
                { attributeValueId: combo.s.id },
                { attributeValueId: combo.c.id },
              ]
            }
          }
        });

        // Add Variant Specific Media (if available)
        const vMedia = combo.c.value === 'Red' ? mediaList[1] : mediaList[2];
        if (vMedia) {
          await prisma.productMedia.create({
            data: {
              productId: p2.id,
              variantId: v.id,
              mediaId: vMedia.id,
              isThumbnail: true,
            }
          });
        }
      }
    }
    
    // Add product base media
    if (mediaList[1]) {
        await prisma.productMedia.create({
          data: {
            productId: p2.id,
            mediaId: mediaList[1].id,
            isThumbnail: false,
            isGallery: true
          }
        });
      }
    console.log(`Seeded Complex Product (with Variants): ${p2.name}`);
  }

  // --- Product 3: Simple Product on Sale ---
  const p3 = await prisma.product.create({
    data: {
      name: 'Leather Minimalist Wallet',
      slug: 'leather-minimalist-wallet',
      sku: 'LMW-001',
      shortDescription: 'Genuine leather slim wallet.',
      hasVariants: false,
      price: 60.00,
      salePrice: 45.00, // On sale!
      stock: 15,
      stockStatus: 'low_stock',
      active: true,
    }
  });
  if (mediaList[3]) {
    await prisma.productMedia.create({
      data: {
        productId: p3.id,
        mediaId: mediaList[3].id,
        isThumbnail: true,
        isGallery: true
      }
    });
  }
  console.log(`Seeded Product on Sale: ${p3.name}`);

  console.log('Products seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
