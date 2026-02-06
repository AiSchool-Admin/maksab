#!/usr/bin/env node
/**
 * Icon Generation Script for مكسب PWA
 *
 * Prerequisites: npm install sharp
 * Usage: node scripts/generate-icons.js
 *
 * Generates PWA icons from the SVG source at public/icons/icon.svg
 * Output: public/icons/icon-192x192.png, public/icons/icon-512x512.png
 *
 * NOTE: For production deployment, run this script once to generate PNG icons,
 * then update manifest.json to reference the PNG files alongside the SVG.
 */

const fs = require("fs");
const path = require("path");

async function generateIcons() {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.log("⚠️  'sharp' package not installed.");
    console.log("   Install it with: npm install -D sharp");
    console.log("   Then re-run: node scripts/generate-icons.js");
    console.log("");
    console.log("   Alternatively, use any image editor to create:");
    console.log("   - public/icons/icon-192x192.png (192x192px, green #1B7A3D background, white م)");
    console.log("   - public/icons/icon-512x512.png (512x512px, same design)");
    process.exit(0);
  }

  const svgPath = path.join(__dirname, "../public/icons/icon.svg");
  const svg = fs.readFileSync(svgPath);

  const sizes = [192, 512];

  for (const size of sizes) {
    const outputPath = path.join(__dirname, `../public/icons/icon-${size}x${size}.png`);
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✅ Generated ${outputPath}`);
  }

  console.log("");
  console.log("🎉 Icons generated! Update manifest.json to add PNG entries if desired.");
}

generateIcons().catch(console.error);
