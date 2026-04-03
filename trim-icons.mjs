import sharp from 'sharp';
import { readdirSync } from 'fs';
import { join } from 'path';

const publicDir = './public';
const icons = readdirSync(publicDir).filter(f => f.startsWith('icon_') && f.endsWith('.png'));

for (const icon of icons) {
  const input = join(publicDir, icon);
  try {
    await sharp(input)
      .trim({ background: { r: 255, g: 255, b: 255, alpha: 1 }, threshold: 30 })
      .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(input + '.tmp.png');

    const { rename } = await import('fs/promises');
    await rename(input + '.tmp.png', input);
    console.log(`✓ ${icon}`);
  } catch (e) {
    console.error(`✗ ${icon}: ${e.message}`);
  }
}
