import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const search = 'shirt';
  console.log('Testing search query with:', search);

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const products = await prisma.product.findMany({
      where,
      take: 10
    });
    console.log(`Found ${products.length} products`);
    console.log(products.map(p => p.name));
  } catch (err) {
    console.error('Error during query:', err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
