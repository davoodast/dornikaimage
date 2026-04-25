/**
 * scripts/generate-icons.js
 * Generates PWA icons using Sharp from an inline SVG.
 * Run: node scripts/generate-icons.js
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.resolve(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// SVG icon: teal square with white "D"
function buildSvg(size) {
  const radius = Math.round(size * 0.18);
  const fontSize = Math.round(size * 0.52);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#0f172a"/>
  <rect x="${Math.round(size * 0.06)}" y="${Math.round(size * 0.06)}"
    width="${Math.round(size * 0.88)}" height="${Math.round(size * 0.88)}"
    rx="${Math.round(radius * 0.8)}" fill="#14b8a6"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-family="Arial, sans-serif" font-weight="bold" font-size="${fontSize}"
    fill="white">D</text>
</svg>`;
}

// Maskable icon has extra padding (safe zone = inner 80%)
function buildMaskableSvg(size) {
  const inner = Math.round(size * 0.8);
  const offset = Math.round((size - inner) / 2);
  const radius = Math.round(inner * 0.18);
  const fontSize = Math.round(inner * 0.52);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0f172a"/>
  <rect x="${offset}" y="${offset}" width="${inner}" height="${inner}"
    rx="${radius}" fill="#14b8a6"/>
  <text x="50%" y="51%" dominant-baseline="middle" text-anchor="middle"
    font-family="Arial, sans-serif" font-weight="bold" font-size="${fontSize}"
    fill="white">D</text>
</svg>`;
}

async function generate() {
  const icons = [
    { name: 'icon-192.png', size: 192, maskable: false },
    { name: 'icon-512.png', size: 512, maskable: false },
    { name: 'icon-512-maskable.png', size: 512, maskable: true },
  ];

  for (const { name, size, maskable } of icons) {
    const svg = maskable ? buildMaskableSvg(size) : buildSvg(size);
    const outPath = path.join(OUTPUT_DIR, name);
    await sharp(Buffer.from(svg)).png().toFile(outPath);
    console.log(`✓ Generated ${name} (${size}×${size})`);
  }

  console.log('\nAll PWA icons generated in public/icons/');
}

generate().catch((err) => {
  console.error('Icon generation failed:', err.message);
  process.exit(1);
});
