import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const prisma = new PrismaClient();

const downloadImage = (url: string, filepath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      // Follow redirects if placehold.co redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImage(res.headers.location as string, filepath).then(resolve).catch(reject);
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${res.statusCode})`));
        return;
      }
      const stream = fs.createWriteStream(filepath);
      res.pipe(stream);
      stream.on('finish', () => {
        stream.close();
        resolve();
      });
      stream.on('error', (err) => {
        fs.unlink(filepath, () => reject(err));
      });
    }).on('error', reject);
  });
};

async function main() {
  const admin = await prisma.user.findFirst();
  if (!admin) {
    console.error('No users found in database. Cannot seed media.');
    return;
  }

  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const dummyImages = [
    { name: 'product_red_shirt.png', url: 'https://placehold.co/800x800/ff0000/ffffff/png?text=Red+Shirt' },
    { name: 'product_blue_shirt.png', url: 'https://placehold.co/800x800/0000ff/ffffff/png?text=Blue+Shirt' },
    { name: 'hero_banner.png', url: 'https://placehold.co/1200x400/222222/ffffff/png?text=Summer+Sale' },
    { name: 'brand_logo.png', url: 'https://placehold.co/200x200/000000/ffffff/png?text=Brand' },
    { name: 'shoes_variant_1.png', url: 'https://placehold.co/600x600/333333/ffffff/png?text=Sneakers' },
  ];

  for (const img of dummyImages) {
    const filename = `${Date.now()}_${img.name}`;
    const filepath = path.join(uploadsDir, filename);
    
    console.log(`Downloading ${img.name}...`);
    try {
      await downloadImage(img.url, filepath);
      
      const stats = fs.statSync(filepath);
      
      await prisma.media.create({
        data: {
          fileName: img.name,
          storedPath: filepath,
          publicUrl: `/uploads/${filename}`,
          mimeType: 'image/png',
          type: 'image',
          size: stats.size,
          width: img.name.includes('banner') ? 1200 : img.name.includes('logo') ? 200 : 800,
          height: img.name.includes('banner') ? 400 : img.name.includes('logo') ? 200 : 800,
          title: `Dummy ${img.name.split('.')[0].replace(/_/g, ' ')}`,
          altText: `A dummy placeholder for ${img.name}`,
          uploadedById: admin.id,
        }
      });
      console.log(`Seeded ${img.name} into database.`);
    } catch (e) {
      console.error(`Error processing ${img.name}:`, e);
    }
  }

  console.log('Media seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
