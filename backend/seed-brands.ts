import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.brand.deleteMany();

  // Find images containing 'logo' in their title or name
  const logos = await prisma.media.findMany({
    where: { 
      type: 'image',
      fileName: { contains: 'logo' }
    },
    take: 3
  });

  const brandsToSeed = [
    { name: 'Nike', slug: 'nike', description: 'Just do it', logoId: logos[0]?.id },
    { name: 'Adidas', slug: 'adidas', description: 'Impossible is Nothing', logoId: logos[1]?.id },
    { name: 'Puma', slug: 'puma', description: 'Forever Faster', logoId: logos[2]?.id || logos[0]?.id },
    { name: 'Apple', slug: 'apple', description: 'Think Different', logoId: null },
    { name: 'Samsung', slug: 'samsung', description: 'Do what you cant', logoId: null },
  ];

  for (const brand of brandsToSeed) {
    await prisma.brand.create({
      data: {
        name: brand.name,
        slug: brand.slug,
        description: brand.description,
        logoId: brand.logoId,
        status: true,
      }
    });
    console.log(`Seeded Brand: ${brand.name}`);
  }

  console.log('Brands seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
