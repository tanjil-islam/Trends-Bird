import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const roleName = 'Catalog Viewer';
  const viewerRole = await prisma.role.findFirst({ where: { name: roleName } });
  
  if (!viewerRole) {
    console.log(`Role '${roleName}' not found.`);
    return;
  }

  // Define the safe read-only permissions we want to KEEP
  const safePermissionNames = [
    'product:read',
    'category:read',
    'brand:read',
    'attribute:read',
    'media:read'
  ];

  console.log(`Found role '${viewerRole.name}' (ID: ${viewerRole.id}). Stripping dangerous permissions...`);

  // First, find the IDs of all safe permissions
  const safePermissions = await prisma.permission.findMany({
    where: { name: { in: safePermissionNames } }
  });
  
  const safePermissionIds = safePermissions.map(p => p.id);

  // Delete all role permissions for this role that are NOT in the safe list
  const deleteResult = await prisma.rolePermission.deleteMany({
    where: {
      roleId: viewerRole.id,
      permissionId: { notIn: safePermissionIds }
    }
  });

  console.log(`Successfully removed ${deleteResult.count} dangerous/unnecessary permissions from '${viewerRole.name}'.`);
  
  // Verify what's left
  const finalPermissions = await prisma.rolePermission.findMany({
    where: { roleId: viewerRole.id },
    include: { permission: true }
  });
  
  console.log('Final safe permissions for the role:');
  finalPermissions.forEach(rp => console.log(` - ${rp.permission.name}`));
}

run()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
