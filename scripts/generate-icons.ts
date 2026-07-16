import fs from 'fs';
import path from 'path';
import { createCanvas } from 'canvas';

const iconDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

function createIcon(size: number, maskable: boolean) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f97316';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#ffffff';
  const padding = maskable ? size * 0.15 : size * 0.25;
  const innerSize = size - padding * 2;
  const center = size / 2;

  ctx.beginPath();
  ctx.moveTo(center, padding);
  ctx.lineTo(center + innerSize / 2, center);
  ctx.lineTo(center, size - padding);
  ctx.lineTo(center - innerSize / 2, center);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  const squareSize = innerSize * 0.3;
  ctx.fillRect(center - squareSize / 2, center - squareSize / 2, squareSize, squareSize);

  return canvas.toBuffer('image/png');
}

fs.writeFileSync(path.join(iconDir, 'icon-192.png'), createIcon(192, false));
fs.writeFileSync(path.join(iconDir, 'icon-512.png'), createIcon(512, false));
fs.writeFileSync(path.join(iconDir, 'icon-maskable-192.png'), createIcon(192, true));
fs.writeFileSync(path.join(iconDir, 'icon-maskable-512.png'), createIcon(512, true));

console.log('Icons generated successfully!');