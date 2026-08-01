import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.attributeValue.deleteMany();
  await prisma.attribute.deleteMany();

  // 1. Dropdown Attribute (e.g., Size)
  await prisma.attribute.create({
    data: {
      name: 'Size',
      slug: 'size',
      type: 'dropdown',
      values: {
        create: [
          { value: 'Small', slug: 's' },
          { value: 'Medium', slug: 'm' },
          { value: 'Large', slug: 'l' },
          { value: 'X-Large', slug: 'xl' },
        ]
      }
    }
  });

  // 2. Colour Swatch Attribute (e.g., Color)
  await prisma.attribute.create({
    data: {
      name: 'Color',
      slug: 'color',
      type: 'colour_swatch',
      values: {
        create: [
          { value: 'Red', slug: 'red', referenceValue: '#ef4444' },
          { value: 'Blue', slug: 'blue', referenceValue: '#3b82f6' },
          { value: 'Green', slug: 'green', referenceValue: '#10b981' },
          { value: 'Black', slug: 'black', referenceValue: '#000000' },
          { value: 'White', slug: 'white', referenceValue: '#ffffff' },
        ]
      }
    }
  });

  // 3. Radio Attribute (e.g., Material)
  await prisma.attribute.create({
    data: {
      name: 'Material',
      slug: 'material',
      type: 'radio',
      values: {
        create: [
          { value: 'Cotton', slug: 'cotton' },
          { value: 'Polyester', slug: 'polyester' },
          { value: 'Leather', slug: 'leather' },
        ]
      }
    }
  });

  console.log('Attributes seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
