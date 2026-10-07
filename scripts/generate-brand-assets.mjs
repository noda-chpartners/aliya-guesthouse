import fs from 'node:fs';
import sharp from 'sharp';

const svg = fs.readFileSync('public/favicon.svg');
const png32 = await sharp(svg).resize(32, 32).png().toBuffer();

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);

const entry = Buffer.alloc(16);
entry.writeUInt8(32, 0);
entry.writeUInt8(32, 1);
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(png32.length, 8);
entry.writeUInt32LE(22, 12);

fs.writeFileSync('public/favicon.ico', Buffer.concat([header, entry, png32]));
await sharp(svg).resize(180, 180).png().toFile('public/apple-touch-icon.png');

const overlay = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1c1a17" stop-opacity="0.18"/>
      <stop offset="42%" stop-color="#1c1a17" stop-opacity="0.02"/>
      <stop offset="100%" stop-color="#1c1a17" stop-opacity="0.78"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <text x="72" y="468" fill="#f3eee6" font-family="Georgia, 'Times New Roman', serif" font-size="96">ALIYA</text>
  <text x="76" y="528" fill="#f3eee6" font-family="Georgia, 'Times New Roman', serif" font-size="28">Guesthouse  ·  Taisho, Osaka</text>
</svg>`);

const resized = await sharp('src/assets/images/3bfcccb2-d02f-4b01-9982-95e8dd2d37cf.avif')
	.resize(1200, 630, { fit: 'cover', position: 'centre' })
	.toBuffer();

await sharp(resized).composite([{ input: overlay }]).jpeg({ quality: 82 }).toFile('public/ogp.jpg');
console.log('wrote brand assets');
