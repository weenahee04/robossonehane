import { readFileSync, writeFileSync } from 'fs';
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
  const svgPath = join('public', `${name}.svg`);
  const content = readFileSync(svgPath, 'utf-8');

  const match = content.match(/xlink:href="data:image\/png;base64,([^"]+)"/);
  if (!match) {
    console.log(`❌ ไม่เจอ base64 ใน ${name}.svg`);
    continue;
  }

  const base64 = match[1];
  const buffer = Buffer.from(base64, 'base64');
  const outPath = join('public', `${name}.png`);
  writeFileSync(outPath, buffer);
  console.log(`✅ ${name}.png (${(buffer.length / 1024).toFixed(1)} KB)`);
}
