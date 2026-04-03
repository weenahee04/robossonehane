import sharp from 'sharp';
import { readdirSync } from 'fs';
import { join } from 'path';

const srcDir = 'C:/Users/PC/Desktop/new-icons';
const outDir = 'public';

const files = readdirSync(srcDir).filter(f => f.endsWith('.png'));

for (const file of files) {
  await sharp(join(srcDir, file))
    .resize(128, 128, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png({ quality: 100, compressionLevel: 6 })
    .toFile(join(outDir, file));
  console.log(`✅ ${file} → 128x128`);
}
