import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const MODULES = [
  'permission',
  'role',
  'user',
  'media',
  'category',
  'brand',
  'attribute',
  'product',
];

const ACTIONS = ['create', 'read', 'update', 'delete'];

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data in reverse dependency order
  console.log('🗑️  Clearing existing data...');
  await prisma.variantAttributeValue.deleteMany();
  await prisma.productMedia.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.attributeValue.deleteMany();
  await prisma.attribute.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  await prisma.media.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.permissionGroup.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  // Create permission groups and permissions
  console.log('🔑 Creating permissions...');
  const allPermissions: { id: string; name: string }[] = [];

  for (const moduleName of MODULES) {
    const group = await prisma.permissionGroup.create({
      data: {
        name: moduleName,
        description: `${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} management permissions`,
      },
    });

    for (const action of ACTIONS) {
      const permission = await prisma.permission.create({
        data: {
          name: `${moduleName}:${action}`,
          description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${moduleName}`,
          groupId: group.id,
        },
      });
      allPermissions.push({ id: permission.id, name: permission.name });
    }
  }

  console.log(`   Created ${allPermissions.length} permissions across ${MODULES.length} groups`);

  // Create Super Admin role with ALL permissions
  console.log('👑 Creating Super Admin role...');
  const superAdminRole = await prisma.role.create({
    data: {
      name: 'Super Admin',
      description: 'Full access to all system features',
      status: true,
      permissions: {
        create: allPermissions.map((p) => ({
          permission: { connect: { id: p.id } },
        })),
      },
    },
  });

  // Create Catalog Manager role (limited: only category, brand, attribute, product read)
  console.log('📦 Creating Catalog Manager role...');
  const catalogPermissions = allPermissions.filter((p) =>
    ['category:read', 'brand:read', 'attribute:read', 'product:read'].includes(p.name),
  );

  const catalogManagerRole = await prisma.role.create({
    data: {
      name: 'Catalog Viewer',
      description: 'Can only view catalog items (categories, brands, attributes, products)',
      status: true,
      permissions: {
        create: catalogPermissions.map((p) => ({
          permission: { connect: { id: p.id } },
        })),
      },
    },
  });

  // Create Super Admin user
  console.log('👤 Creating Super Admin user...');
  const hashedPasswordAdmin = await bcrypt.hash('Admin@123', 12);
  await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'admin@trendsbird.com',
      password: hashedPasswordAdmin,
      phone: '+8801700000000',
      gender: 'male',
      active: true,
      roleId: superAdminRole.id,
    },
  });

  // Create Limited user
  console.log('👤 Creating Limited user...');
  const hashedPasswordLimited = await bcrypt.hash('User@123', 12);
  await prisma.user.create({
    data: {
      name: 'Catalog Viewer',
      email: 'viewer@trendsbird.com',
      password: hashedPasswordLimited,
      phone: '+8801700000001',
      gender: 'female',
      active: true,
      roleId: catalogManagerRole.id,
    },
  });

  console.log('');
  console.log('✅ Seeding completed successfully!');
  console.log('');
  console.log('📋 Credentials:');
  console.log('   Super Admin:     admin@trendsbird.com  / Admin@123');
  console.log('   Catalog Viewer:  viewer@trendsbird.com / User@123');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
