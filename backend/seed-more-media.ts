import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const prisma = new PrismaClient();

const downloadImage = (url: string, filepath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
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
    { name: 'winter_jacket.png', url: 'https://placehold.co/800x800/1e3a8a/ffffff/png?text=Winter+Jacket' },
    { name: 'summer_dress.png', url: 'https://placehold.co/800x800/fcd34d/000000/png?text=Summer+Dress' },
    { name: 'running_shoes.png', url: 'https://placehold.co/800x800/10b981/ffffff/png?text=Running+Shoes' },
    { name: 'smart_watch.png', url: 'https://placehold.co/800x800/000000/ffffff/png?text=Smart+Watch' },
    { name: 'leather_wallet.png', url: 'https://placehold.co/800x800/8b5cf6/ffffff/png?text=Leather+Wallet' },
    { name: 'sunglasses.png', url: 'https://placehold.co/800x800/f43f5e/ffffff/png?text=Sunglasses' },
    { name: 'denim_jeans.png', url: 'https://placehold.co/800x800/3b82f6/ffffff/png?text=Denim+Jeans' },
    { name: 'wool_scarf.png', url: 'https://placehold.co/800x800/64748b/ffffff/png?text=Wool+Scarf' },
    { name: 'promo_banner_1.png', url: 'https://placehold.co/1200x400/9333ea/ffffff/png?text=Spring+Collection' },
    { name: 'promo_banner_2.png', url: 'https://placehold.co/1200x400/ea580c/ffffff/png?text=Flash+Sale+50%25+Off' },
    { name: 'brand_logo_2.png', url: 'https://placehold.co/200x200/ffffff/000000/png?text=Nike' },
    { name: 'brand_logo_3.png', url: 'https://placehold.co/200x200/ffffff/000000/png?text=Adidas' }
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

  console.log('Extra media seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
