import { removeBackground } from '@imgly/background-removal-node';
import fs from 'fs';
import path from 'path';

const icons = [
  'icon_1_home_robot.png',
  'icon_2_calendar.png',
  'icon_3_robot_arm.png',
  'icon_4_gift_robot.png',
  'icon_5_crown_robot.png',
  'icon_6_bell.png',
  'icon_7_bell2.png',
  'icon_8_chat_robots.png',
  'icon_9_robot_gear.png',
];

const publicDir = './public';

for (const icon of icons) {
  const inputPath = path.join(publicDir, icon);
  console.log(`Processing ${icon}...`);
  try {
    const imageBuffer = fs.readFileSync(inputPath);
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    const result = await removeBackground(blob, {
      output: { format: 'image/png' },
    });
    const arrayBuffer = await result.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(inputPath, buffer);
    console.log(`✓ Done: ${icon}`);
  } catch (err) {
    console.error(`✗ Failed: ${icon}`, err.message);
  }
}

console.log('\nAll icons processed!');
