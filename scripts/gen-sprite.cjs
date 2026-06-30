// Generates the label-background sprite used by the "text-background" example.
//
//   node scripts/gen-sprite.cjs public
//
// Emits a 1-icon sprite ("label-bg") as a colored rectangle (square corners by
// default, to match OpenLayers' Text backgroundFill; set RADIUS > 0 to round) plus its
// @2x variant, with 9-slice metadata (stretchX/stretchY/content) so MapLibre's
// icon-text-fit stretches only the middle and the rounded corners stay crisp.
// There is no style property for a label background colour — recolour here.

const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const outDir = process.argv[2] || "public";

// Box fill colour (≈ the swisstopo reference blue) and corner radius as a
// fraction of the icon size. Change FILL to recolour the box.
// Real geoadmin label background: rgba(14, 80, 114, 0.9) — used by every
// ch.bafu.hydroweb-* / ch.meteoschweiz.* label style. Fill only, no border.
const FILL = { r: 14, g: 80, b: 114, a: 0.9 };
const SIZE = 20; // @1x icon size in px
// Square corners (radius 0) to match OpenLayers' Text backgroundFill, which is a
// plain rectangle with no border radius. Bump this for rounded corners.
const RADIUS = 0; // @1x corner radius in px

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

// Coverage (0..1) of a rounded-rect at pixel (px,py), via 4x4 supersampling.
function coverage(px, py, n, r) {
  let hits = 0;
  for (let sx = 0; sx < 4; sx++) {
    for (let sy = 0; sy < 4; sy++) {
      const x = px + (sx + 0.5) / 4;
      const y = py + (sy + 0.5) / 4;
      // Clamp to the corner-centre rectangle, then test distance to it.
      const cx = Math.min(Math.max(x, r), n - r);
      const cy = Math.min(Math.max(y, r), n - r);
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) hits++;
    }
  }
  return hits / 16;
}

function roundedRectPng(size, radius) {
  const w = size,
    h = size;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 4 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < w; x++) {
      const a = Math.round(255 * (FILL.a ?? 1) * coverage(x, y, size, radius));
      const p = row + 1 + x * 4;
      raw[p] = FILL.r;
      raw[p + 1] = FILL.g;
      raw[p + 2] = FILL.b;
      raw[p + 3] = a; // straight alpha (anti-aliased edges)
    }
  }
  const idat = zlib.deflateSync(raw);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function spriteJson(size, radius, ratio) {
  return {
    "label-bg": {
      width: size,
      height: size,
      x: 0,
      y: 0,
      pixelRatio: ratio,
      // Stretch only the straight edges between the rounded corners.
      stretchX: [[radius, size - radius]],
      stretchY: [[radius, size - radius]],
      content: [radius, radius, size - radius, size - radius],
    },
  };
}

const variants = [
  { suffix: "", size: SIZE, radius: RADIUS, ratio: 1 },
  { suffix: "@2x", size: SIZE * 2, radius: RADIUS * 2, ratio: 2 },
];

for (const v of variants) {
  fs.writeFileSync(
    path.join(outDir, `sprite${v.suffix}.png`),
    roundedRectPng(v.size, v.radius),
  );
  fs.writeFileSync(
    path.join(outDir, `sprite${v.suffix}.json`),
    JSON.stringify(spriteJson(v.size, v.radius, v.ratio), null, 2) + "\n",
  );
}
console.log(`wrote sprite{,@2x}.{png,json} to ${outDir}`);
