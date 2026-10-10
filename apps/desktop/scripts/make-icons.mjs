// Draws the app icon (the "Cracked Epsilon" mark from packages/ui/src/Logo.tsx) at every size
// Windows uses, and packs them into build/icon.ico (+ build/icon.png). No dependencies:
// the mark is a circle with three cut-outs, so it is rasterized directly, with supersampling.
// Run: node apps/desktop/scripts/make-icons.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateSync } from "node:zlib";

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "build");
const COLOR = [0x0b, 0x16, 0x20]; // the app's near-black text color, like the logo in the title bar

// The mark in its 48×48 design grid (same numbers as Logo.tsx).
const CUTS = [
  { x: 18, y: 14.6, w: 34, h: 3.8, r: 1.9 },
  { x: 18, y: 29.6, w: 34, h: 3.8, r: 1.9 },
  { x: 36, y: 16, w: 14, h: 16, r: 0 },
];
const inRoundRect = (px, py, { x, y, w, h, r }) => {
  if (px < x || px > x + w || py < y || py > y + h) return false;
  const cx = Math.min(Math.max(px, x + r), x + w - r), cy = Math.min(Math.max(py, y + r), y + h - r);
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
};
const inMark = (px, py) => (px - 24) ** 2 + (py - 24) ** 2 <= 400 && !CUTS.some((c) => inRoundRect(px, py, c));

function render(size) {
  const ss = size <= 32 ? 8 : 4; // more samples for tiny sizes, where every pixel shows
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let hit = 0;
    for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
      if (inMark(((x + (sx + 0.5) / ss) / size) * 48, ((y + (sy + 0.5) / ss) / size) * 48)) hit++;
    }
    const i = (y * size + x) * 4;
    rgba[i] = COLOR[0]; rgba[i + 1] = COLOR[1]; rgba[i + 2] = COLOR[2];
    rgba[i + 3] = Math.round((hit / (ss * ss)) * 255);
  }
  return rgba;
}

function png(size, rgba) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) rgba.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(rows, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

// The classic bitmap form of an icon image (what every Windows tool reads): a 32-bit
// bottom-up BGRA bitmap, plus the old 1-bit "AND" mask (all zero: alpha does the work).
function dib(size, rgba) {
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0); header.writeInt32LE(size, 4); header.writeInt32LE(size * 2, 8);
  header.writeUInt16LE(1, 12); header.writeUInt16LE(32, 14);
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const from = ((size - 1 - y) * size + x) * 4, to = (y * size + x) * 4;
    pixels[to] = rgba[from + 2]; pixels[to + 1] = rgba[from + 1]; pixels[to + 2] = rgba[from]; pixels[to + 3] = rgba[from + 3];
  }
  const mask = Buffer.alloc(Math.ceil(size / 32) * 4 * size);
  return Buffer.concat([header, pixels, mask]);
}

// An .ico: bitmaps for the small sizes, PNG for 256 (the usual, most compatible mix).
function ico(images) {
  const head = Buffer.alloc(6); head.writeUInt16LE(1, 2); head.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const dir = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size; e[1] = size >= 256 ? 0 : size;
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8); e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([head, ...dir, ...images.map((i) => i.data)]);
}

mkdirSync(out, { recursive: true });
const sizes = [16, 20, 24, 32, 40, 48, 64, 128, 256];
const images = sizes.map((size) => ({ size, data: size >= 256 ? png(size, render(size)) : dib(size, render(size)) }));
writeFileSync(path.join(out, "icon.ico"), ico(images));
writeFileSync(path.join(out, "icon.png"), png(512, render(512)));
console.log(`build/icon.ico (${sizes.join(", ")}) and build/icon.png written`);
