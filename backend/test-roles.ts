import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const viewerRole = await prisma.role.findFirst({
    where: { name: 'Catalog Viewer' },
    include: { permissions: { include: { permission: true } } }
  });
  if (viewerRole) {
    console.log('Viewer Role:', viewerRole.name);
    console.log('Permissions:');
    viewerRole.permissions.forEach(rp => console.log(' - ' + rp.permission.name));
  } else {
    console.log('Viewer role not found.');
  }
}
run();
