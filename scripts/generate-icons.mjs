#!/usr/bin/env node
// Regenerate every app icon from the single brand source image.
//
// The icons in assets/ are generated, not hand-drawn — if the logo ever
// changes, replace assets/logo-source.png and re-run this rather than editing
// seven PNGs by hand. The filenames written here are exactly the ones app.json
// already points at, so no config change is needed.
//
// Usage:
//   npm i --no-save sharp && node scripts/generate-icons.mjs
//
// sharp is deliberately NOT a dependency: it ships large platform-specific
// binaries and is only ever needed for this one-off, so it stays out of the
// Expo Go install (see the SDK 54 pinning notes in README).

// Installed on demand (see Usage above); intentionally absent from package.json.
// eslint-disable-next-line import/no-unresolved
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const SRC = join(ASSETS, 'logo-source.png');

// Matches android.adaptiveIcon.backgroundColor in app.json — the flat layer we
// generate and the colour Android falls back to must not disagree.
const CREAM = { r: 0xfa, g: 0xf6, b: 0xf3, alpha: 1 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

// Trim the transparent margin first so every size below is computed from the
// mark itself, not from whatever whitespace the export happened to include.
const trimmed = await sharp(SRC).trim().png().toBuffer();
const meta = await sharp(trimmed).metadata();
console.log(`trimmed source: ${meta.width}x${meta.height}`);

/** Fit the mark inside `size`, occupying `ratio` of it, over `bg`. */
async function tile(size, ratio, bg, file) {
  // ratio 0 = a plain fill with no mark (the adaptive-icon background layer).
  // Without this branch resize(0, 0) throws.
  if (ratio === 0) {
    const flat = sharp({
      create: { width: size, height: size, channels: 4, background: bg },
    }).png();
    await writeFile(join(ASSETS, file), await flat.toBuffer());
    console.log(`${file.padEnd(30)} ${size}x${size}  flat fill`);
    return;
  }
  const inner = Math.round(size * ratio);
  const mark = await sharp(trimmed)
    .resize(inner, inner, { fit: 'inside', background: CLEAR })
    .toBuffer();
  const img = sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png();
  await writeFile(join(ASSETS, file), await img.toBuffer());
  console.log(`${file.padEnd(30)} ${size}x${size}  mark ${Math.round(ratio * 100)}%`);
}

// iOS rejects any transparency in the home-screen icon, so the pin sits on cream.
await tile(1024, 0.78, CREAM, 'icon.png');

// Splash keeps transparency; Expo centres it on the configured background.
await tile(1024, 0.7, CLEAR, 'splash-icon.png');

// Adaptive icon: Android crops to a circle/squircle and only the middle ~66%
// is guaranteed to survive, so the mark is deliberately smaller here. At the
// 78% used for iOS the pin's point gets shaved off by a circular mask.
await tile(1024, 0.56, CLEAR, 'android-icon-foreground.png');
await tile(1024, 0, CREAM, 'android-icon-background.png');

// Favicon: the "RADAR" wordmark is unreadable this small either way — the pin
// silhouette is what identifies the tab.
await tile(64, 0.86, CREAM, 'favicon.png');

// Standalone mark, transparent, full quality.
await writeFile(join(ASSETS, 'logo-mark.png'), trimmed);
console.log(`${'logo-mark.png'.padEnd(30)} ${meta.width}x${meta.height}  (trimmed original)`);

// Themed icons: Android recolours a flat silhouette, so take the alpha channel
// and paint it solid white. Feeding it the full-colour mark would come out as
// a muddy single-tone blob.
{
  const size = 1024;
  const inner = Math.round(size * 0.56);
  const alpha = await sharp(trimmed)
    .resize(inner, inner, { fit: 'inside' })
    .extractChannel('alpha')
    .toBuffer();
  const shape = await sharp({
    create: {
      width: inner,
      height: inner,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: alpha, blend: 'dest-in' }])
    .png()
    .toBuffer();
  const img = sharp({
    create: { width: size, height: size, channels: 4, background: CLEAR },
  })
    .composite([{ input: shape, gravity: 'center' }])
    .png();
  await writeFile(join(ASSETS, 'android-icon-monochrome.png'), await img.toBuffer());
  console.log(`${'android-icon-monochrome.png'.padEnd(30)} ${size}x${size}  white silhouette`);
}
