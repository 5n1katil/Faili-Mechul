#!/usr/bin/env node
/**
 * Beyaz çizgi / siyah fon (veya bozuk alfa: renk var, A≈0) kaynakları → 512×512 Hacer maskesi.
 * İçerik bbox kırpılır, letterbox ile ortalanır; köşelerde opak kutu kalmaz (Feriha/Tarık ile aynı davranış).
 */
"use strict";

const fs = require("fs");
const zlib = require("zlib");

const OUT = 512;
const PAD_PX = 10;
/** BBox: güvenilir alfa değil — mor çerçeve A=255 ama düşük parlaklık; sadece çizgi pikselleri. */
const BBOX_LUM_MIN = 48;
const BBOX_CHROMA_MAX = 200;

const LUM_FLOOR = 10;
const LUM_CAP = 252;

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}

function readChunk(buf, off) {
  const len = buf.readUInt32BE(off);
  const type = buf.toString("ascii", off + 4, off + 8);
  const data = buf.subarray(off + 8, off + 8 + len);
  return { len, type, data, next: off + 12 + len };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilterScanlines(raw, width, height, bpp) {
  const stride = width * bpp;
  const out = Buffer.allocUnsafe(stride * height);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = out.subarray(y * stride, y * stride + stride);
    if (f === 0) row.copy(cur);
    else if (f === 1) {
      for (let x = 0; x < stride; x++) {
        const left = x >= bpp ? cur[x - bpp] : 0;
        cur[x] = (row[x] + left) & 255;
      }
    } else if (f === 2) {
      for (let x = 0; x < stride; x++) cur[x] = (row[x] + prev[x]) & 255;
    } else if (f === 3) {
      for (let x = 0; x < stride; x++) {
        const left = x >= bpp ? cur[x - bpp] : 0;
        cur[x] = (row[x] + ((left + prev[x]) >> 1)) & 255;
      }
    } else if (f === 4) {
      for (let x = 0; x < stride; x++) {
        const left = x >= bpp ? cur[x - bpp] : 0;
        const up = prev[x];
        const upleft = x >= bpp ? prev[x - bpp] : 0;
        cur[x] = (row[x] + paeth(left, up, upleft)) & 255;
      }
    }
    prev = Buffer.from(cur);
  }
  return out;
}

function decodePng(buf) {
  let off = 8;
  let width, height, colorType;
  let palette = null;
  let trns = null;
  const idat = [];
  while (off < buf.length) {
    const ch = readChunk(buf, off);
    off = ch.next;
    if (ch.type === "IHDR") {
      width = ch.data.readUInt32BE(0);
      height = ch.data.readUInt32BE(4);
      colorType = ch.data[9];
    } else if (ch.type === "PLTE") palette = ch.data;
    else if (ch.type === "tRNS") trns = ch.data;
    else if (ch.type === "IDAT") idat.push(ch.data);
    else if (ch.type === "IEND") break;
  }
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  if (colorType === 3) {
    if (!palette || palette.length % 3 !== 0) throw new Error("Indexed PNG: missing PLTE");
    const raw = unfilterScanlines(inflated, width, height, 1);
    const rgba = Buffer.alloc(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      const idx = raw[i];
      const p = idx * 3;
      const j = i * 4;
      rgba[j] = palette[p];
      rgba[j + 1] = palette[p + 1];
      rgba[j + 2] = palette[p + 2];
      rgba[j + 3] = trns && idx < trns.length ? trns[idx] : 255;
    }
    return { width, height, rgba };
  }
  const spp = colorType === 6 ? 4 : colorType === 2 ? 3 : null;
  if (!spp) throw new Error("Unsupported PNG color type: " + colorType);
  const raw = unfilterScanlines(inflated, width, height, spp);
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0, j = 0; i < raw.length; i += spp, j += 4) {
    rgba[j] = raw[i];
    rgba[j + 1] = raw[i + 1];
    rgba[j + 2] = raw[i + 2];
    rgba[j + 3] = spp === 4 ? raw[i + 3] : 255;
  }
  return { width, height, rgba };
}

function packChunk(type, data) {
  const buf = Buffer.allocUnsafe(8 + data.length + 4);
  buf.writeUInt32BE(data.length, 0);
  buf.write(type, 4, 4, "ascii");
  data.copy(buf, 8);
  buf.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return buf;
}

function encodePngRgba(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.allocUnsafe((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    packChunk("IHDR", ihdr),
    packChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    packChunk("IEND", Buffer.alloc(0)),
  ]);
}

function lum(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** İçerik tespiti: beyaz/açık çizgiler; karanlık mor çerçeve (düşük L, düşük M) hariç. */
function isInk(r, g, b, a) {
  const L = lum(r, g, b);
  const M = Math.max(r, g, b);
  if (M > BBOX_CHROMA_MAX) return true;
  if (L >= BBOX_LUM_MIN) return true;
  // Nadiren: çok soluk ama anlamlı alfa (düzgün şeffaf export)
  if (a > 90 && L >= 30) return true;
  return false;
}

function alphaFromRgbA(r, g, b, a) {
  const L = lum(r, g, b);
  const M = Math.max(r, g, b);
  // Mor/koyu çerçeve ve gürültü
  if (L < 40 && M < 70) return 0;
  if (a > 90 && L >= 55 && M >= 70) return Math.min(255, a);
  if (L < LUM_FLOOR) return 0;
  const norm = Math.min(1, (L - LUM_FLOOR) / (LUM_CAP - LUM_FLOOR));
  return Math.min(255, Math.round(Math.pow(norm, 0.4) * 255));
}


function getRgba(w, h, rgba, x, y) {
  const p = (y * w + x) * 4;
  return [rgba[p], rgba[p + 1], rgba[p + 2], rgba[p + 3]];
}

/** Bilinear sample 0≤sx≤w-1, 0≤sy≤h-1 */
function sampleBilinear(w, h, rgba, sx, sy) {
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const tx = sx - x0;
  const ty = sy - y0;
  const p00 = getRgba(w, h, rgba, x0, y0);
  const p10 = getRgba(w, h, rgba, x1, y0);
  const p01 = getRgba(w, h, rgba, x0, y1);
  const p11 = getRgba(w, h, rgba, x1, y1);
  const interp = (c) => {
    const v0 = p00[c] * (1 - tx) + p10[c] * tx;
    const v1 = p01[c] * (1 - tx) + p11[c] * tx;
    return v0 * (1 - ty) + v1 * ty;
  };
  return [
    interp(0),
    interp(1),
    interp(2),
    interp(3),
  ];
}

function toHacerRgba(width, height, rgba) {
  const n = width * height;
  const out = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    out[p] = 0;
    out[p + 1] = 0;
    out[p + 2] = 0;
    out[p + 3] = rgba[p + 3];
  }
  return out;
}

const input = process.argv[2];
const output = process.argv[3];
if (!input || !output) {
  console.error("Usage: node canonicalize-silhouette-png.js <input.png> <output-hacer.png>");
  process.exit(1);
}

const { width: W, height: H, rgba: src } = decodePng(fs.readFileSync(input));

let bx0 = W,
  by0 = H,
  bx1 = -1,
  by1 = -1;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const p = (y * W + x) * 4;
    const r = src[p],
      g = src[p + 1],
      b = src[p + 2],
      a = src[p + 3];
    if (isInk(r, g, b, a)) {
      if (x < bx0) bx0 = x;
      if (y < by0) by0 = y;
      if (x > bx1) bx1 = x;
      if (y > by1) by1 = y;
    }
  }
}

if (bx1 < bx0) {
  console.error("No drawable ink found (solid empty image?)");
  process.exit(1);
}

bx0 = Math.max(0, bx0 - PAD_PX);
by0 = Math.max(0, by0 - PAD_PX);
bx1 = Math.min(W - 1, bx1 + PAD_PX);
by1 = Math.min(H - 1, by1 + PAD_PX);

const cw = bx1 - bx0 + 1;
const ch = by1 - by0 + 1;
const inner = OUT - PAD_PX * 2;
const scale = Math.min(inner / cw, inner / ch);
const dw = cw * scale;
const dh = ch * scale;
const ox0 = (OUT - dw) / 2;
const oy0 = (OUT - dh) / 2;

const out = Buffer.alloc(OUT * OUT * 4);

for (let y = 0; y < OUT; y++) {
  for (let x = 0; x < OUT; x++) {
    const oi = (y * OUT + x) * 4;
    const fx = x - ox0;
    const fy = y - oy0;
    if (fx < 0 || fy < 0 || fx >= dw - 1e-9 || fy >= dh - 1e-9) continue;
    const sx = bx0 + (fx / scale);
    const sy = by0 + (fy / scale);
    const [r, g, b, av] = sampleBilinear(W, H, src, sx, sy);
    const a = alphaFromRgbA(
      Math.round(r),
      Math.round(g),
      Math.round(b),
      Math.round(av),
    );
    if (a < 2) continue;
    out[oi + 3] = a;
  }
}

fs.writeFileSync(output, encodePngRgba(OUT, OUT, toHacerRgba(OUT, OUT, out)));
console.log("Wrote", output, `${OUT}x${OUT}`, "crop", cw, "x", ch, "scale", scale.toFixed(4));
