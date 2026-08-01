import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing categories to avoid slug unique constraint errors if running multiple times
  await prisma.category.deleteMany();

  // Get an image to use as category image
  const images = await prisma.media.findMany({
    where: { type: 'image' },
    take: 5
  });

  // Main Categories
  const mensCat = await prisma.category.create({
    data: {
      name: "Men's Fashion",
      slug: 'mens-fashion',
      description: 'Clothing and accessories for men',
      imageId: images[0]?.id,
      sortOrder: 1,
      active: true
    }
  });

  const womensCat = await prisma.category.create({
    data: {
      name: "Women's Fashion",
      slug: 'womens-fashion',
      description: 'Clothing and accessories for women',
      imageId: images[1]?.id,
      sortOrder: 2,
      active: true
    }
  });

  const electronicsCat = await prisma.category.create({
    data: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Gadgets and electronic devices',
      imageId: images[2]?.id,
      sortOrder: 3,
      active: true
    }
  });

  // Subcategories for Men
  await prisma.category.create({
    data: {
      name: 'Shirts',
      slug: 'mens-shirts',
      parentId: mensCat.id,
      sortOrder: 1
    }
  });
  
  await prisma.category.create({
    data: {
      name: 'Shoes',
      slug: 'mens-shoes',
      parentId: mensCat.id,
      sortOrder: 2
    }
  });

  // Subcategories for Women
  await prisma.category.create({
    data: {
      name: 'Dresses',
      slug: 'womens-dresses',
      parentId: womensCat.id,
      sortOrder: 1
    }
  });
  
  await prisma.category.create({
    data: {
      name: 'Bags',
      slug: 'womens-bags',
      parentId: womensCat.id,
      sortOrder: 2
    }
  });

  // Subcategories for Electronics
  await prisma.category.create({
    data: {
      name: 'Smartphones',
      slug: 'smartphones',
      parentId: electronicsCat.id,
      sortOrder: 1
    }
  });
  
  await prisma.category.create({
    data: {
      name: 'Wearables',
      slug: 'wearables',
      parentId: electronicsCat.id,
      sortOrder: 2
    }
  });

  console.log('Categories seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
