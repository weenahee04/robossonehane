import sharp from 'sharp';
import { join } from 'path';

const icons = [
  'icon_01_robot_home',
  'icon_02_calendar',
  'icon_03_robot_arm',
  'icon_04_robot_gift',
  'icon_05_robot_crown',
  'icon_06_bell',
  'icon_07_bell2',
  'icon_08_robot_chat',
  'icon_09_robot_settings',
];

for (const name of icons) {
  const inPath = join('public', `${name}.png`);
  const outPath = join('public', `${name}.png`);

  await sharp(inPath)
    .resize(120, 120, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 100 })
    .toFile(outPath + '.tmp');

  // replace original
  const { renameSync } = await import('fs');
  renameSync(outPath + '.tmp', outPath);
  console.log(`✅ resized ${name}.png → 120x120`);
}
