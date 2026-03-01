/**
 * Generates PWA icon PNGs from the source SVG.
 * Run: node scripts/generate-icons.js
 */
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
const svgPath = path.join(iconsDir, 'icon.svg');

async function generateIcons() {
  try {
    const sharp = require('sharp');
    const svgBuffer = fs.readFileSync(svgPath);

    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(path.join(iconsDir, 'icon-192.png'));

    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(iconsDir, 'icon-512.png'));

    console.log('✓ Generated icon-192.png and icon-512.png');
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.log('Installing sharp...');
      const { execSync } = require('child_process');
      execSync('npm install --save-dev sharp', { stdio: 'inherit' });
      console.log('Please run: node scripts/generate-icons.js');
      process.exit(1);
    }
    throw err;
  }
}

generateIcons();
