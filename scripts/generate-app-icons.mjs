/**
 * Generates the PWA icon set for an app, with no image dependencies.
 *
 * There is no rsvg-convert, ImageMagick, sharp or cairosvg on this machine, and a manifest
 * that only offers SVG gets inconsistent treatment — Android wants 192 and 512 PNGs for the
 * launcher and splash, and iOS ignores the manifest entirely and reads apple-touch-icon.
 * So this rasterises a simple mark directly and encodes PNG with node's zlib.
 *
 * The mark is deliberately plain: a rounded square, a bold N, and a colour that tells the
 * two apps apart on a home screen. Seller Central and the marketplace share a brand, so if
 * both icons were the same white-and-orange tile a seller with both installed could not
 * tell which was which.
 *
 * Usage: node scripts/generate-app-icons.mjs
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

// ---- PNG encoding -------------------------------------------------------------

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

/** rgba: Uint8Array of size*size*4 */
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type: RGBA
  // 10,11,12 = compression, filter, interlace — all 0

  // One filter byte (0 = None) per scanline, then that row's pixels.
  const rowBytes = size * 4;
  const raw = Buffer.alloc(size * (rowBytes + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (rowBytes + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * rowBytes, (y + 1) * rowBytes);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- drawing ------------------------------------------------------------------

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** Signed distance to a rounded rectangle, for anti-aliased edges. */
function roundedRectDistance(px, py, cx, cy, halfW, halfH, radius) {
  const dx = Math.abs(px - cx) - (halfW - radius);
  const dy = Math.abs(py - cy) - (halfH - radius);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) - radius;
}

/** Is this point inside the letter N? Drawn as two stems plus a diagonal. */
function insideN(px, py, x0, y0, w, h, stroke) {
  const x1 = x0 + w, y1 = y0 + h;
  if (py < y0 || py > y1) return false;
  if (px >= x0 && px <= x0 + stroke) return true;            // left stem
  if (px >= x1 - stroke && px <= x1) return true;            // right stem
  // Diagonal from top-left to bottom-right, thickened horizontally.
  const t = (py - y0) / h;
  const centre = x0 + t * (w - stroke) + stroke / 2;
  return Math.abs(px - centre) <= stroke / 2;
}

function drawIcon(size, { ground, mark, padding }) {
  const rgba = new Uint8Array(size * size * 4);
  const [gr, gg, gb] = hex(ground);
  const [mr, mg, mb] = hex(mark);

  const inset = size * padding;
  const half = (size - inset * 2) / 2;
  const radius = (size - inset * 2) * 0.22;
  const cx = size / 2, cy = size / 2;

  // Letter geometry, centred in the tile.
  const glyphH = (size - inset * 2) * 0.46;
  const glyphW = glyphH * 0.82;
  const stroke = glyphH * 0.2;
  const gx = cx - glyphW / 2, gy = cy - glyphH / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5, py = y + 0.5;
      const i = (y * size + x) * 4;

      // Anti-alias the tile edge over one pixel.
      const d = roundedRectDistance(px, py, cx, cy, half, half, radius);
      const tileAlpha = Math.min(Math.max(0.5 - d, 0), 1);
      if (tileAlpha <= 0) continue;

      let r = gr, g = gg, b = gb;
      if (insideN(px, py, gx, gy, glyphW, glyphH, stroke)) { r = mr; g = mg; b = mb; }

      rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b;
      rgba[i + 3] = Math.round(tileAlpha * 255);
    }
  }
  return encodePng(size, Buffer.from(rgba));
}

// ---- outputs -------------------------------------------------------------------

const APPS = {
  'artifacts/seller-central/public': {
    // Navy ground so a seller with both apps installed can tell them apart at a glance.
    ground: '#233548', mark: '#FF6A00',
  },
  'artifacts/global-marketplace/public': {
    ground: '#FFFFFF', mark: '#FF6A00',
  },
};

const root = new URL('..', import.meta.url).pathname;

for (const [dir, colours] of Object.entries(APPS)) {
  mkdirSync(`${root}${dir}`, { recursive: true });
  for (const size of [192, 512]) {
    // Standard icon: mark fills the tile.
    writeFileSync(`${root}${dir}/app-icon-${size}.png`, drawIcon(size, { ...colours, padding: 0.02 }));
    // Maskable: Android crops to a circle, so keep everything inside the 80% safe zone.
    writeFileSync(`${root}${dir}/app-icon-maskable-${size}.png`, drawIcon(size, { ...colours, padding: 0.12 }));
  }
  console.log(`${dir}: app-icon-{192,512}.png + app-icon-maskable-{192,512}.png`);
}
