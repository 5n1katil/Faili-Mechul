#!/usr/bin/env node
/**
 * Black silhouette on white background → RGBA PNG for CSS mask-image / tintColor.
 * No dependencies (uses zlib only). Supports PNG color types 2 (RGB), 3 (indexed + PLTE),
 * and 6 (RGBA), 8-bit and 16-bit (RGB/RGBA only), non-interlaced.
 */
"use strict";

const fs = require("fs");
const zlib = require("zlib");

const THRESH = 248;

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
  const crc = buf.readUInt32BE(off + 8 + len);
  return { len, type, data, crc, next: off + 12 + len };
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
        const up = prev[x];
        cur[x] = (row[x] + ((left + up) >> 1)) & 255;
      }
    } else if (f === 4) {
      for (let x = 0; x < stride; x++) {
        const left = x >= bpp ? cur[x - bpp] : 0;
        const up = prev[x];
        const upleft = x >= bpp ? prev[x - bpp] : 0;
        cur[x] = (row[x] + paeth(left, up, upleft)) & 255;
      }
    } else {
      throw new Error("Unsupported PNG filter: " + f);
    }
    prev = Buffer.from(cur);
  }
  return out;
}

function decodePng(buf) {
  const sig = buf.subarray(0, 8);
  if (!sig.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    throw new Error("Not a PNG file");
  }
  let off = 8;
  let width;
  let height;
  let bitDepth;
  let colorType;
  let palette = null;
  let trns = null;
  const idat = [];
  while (off < buf.length) {
    const ch = readChunk(buf, off);
    off = ch.next;
    if (ch.type === "IHDR") {
      width = ch.data.readUInt32BE(0);
      height = ch.data.readUInt32BE(4);
      bitDepth = ch.data[8];
      colorType = ch.data[9];
      const comp = ch.data[10];
      const filt = ch.data[11];
      const inter = ch.data[12];
      if (bitDepth !== 8 && bitDepth !== 16) throw new Error("Only 8-bit or 16-bit PNG supported");
      if (inter !== 0) throw new Error("Interlaced PNG not supported");
      if (comp !== 0 || filt !== 0) throw new Error("Invalid IHDR");
    } else if (ch.type === "PLTE") {
      palette = ch.data;
    } else if (ch.type === "tRNS") {
      trns = ch.data;
    } else if (ch.type === "IDAT") {
      idat.push(ch.data);
    } else if (ch.type === "IEND") {
      break;
    }
  }
  if (!width || !height) throw new Error("Missing IHDR");

  const inflated = zlib.inflateSync(Buffer.concat(idat));

  if (colorType === 3) {
    if (bitDepth !== 8) throw new Error("Indexed PNG: only 8-bit depth supported");
    if (!palette || palette.length % 3 !== 0) throw new Error("Indexed PNG: missing or invalid PLTE");
    const nColors = palette.length / 3;
    const raw = unfilterScanlines(inflated, width, height, 1);
    const rgba = Buffer.alloc(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      const idx = raw[i];
      if (idx >= nColors) throw new Error("Indexed PNG: pixel index out of range");
      const p = idx * 3;
      const j = i * 4;
      rgba[j] = palette[p];
      rgba[j + 1] = palette[p + 1];
      rgba[j + 2] = palette[p + 2];
      rgba[j + 3] = trns && idx < trns.length ? trns[idx] : 255;
    }
    return { width, height, rgba };
  }

  let samplesPerPixel;
  if (colorType === 6) samplesPerPixel = 4;
  else if (colorType === 2) samplesPerPixel = 3;
  else throw new Error("Unsupported color type: " + colorType);

  const bytesPerSample = bitDepth / 8;
  const bppBytes = bytesPerSample * samplesPerPixel;

  const raw = unfilterScanlines(inflated, width, height, bppBytes);
  const rgba = Buffer.alloc(width * height * 4);
  if (bitDepth === 8) {
    for (let i = 0, j = 0; i < raw.length; i += bppBytes, j += 4) {
      rgba[j] = raw[i];
      rgba[j + 1] = raw[i + 1];
      rgba[j + 2] = raw[i + 2];
      rgba[j + 3] = samplesPerPixel === 4 ? raw[i + 3] : 255;
    }
  } else {
    for (let i = 0, j = 0; i < raw.length; i += bppBytes, j += 4) {
      const r = raw.readUInt16BE(i);
      const g = raw.readUInt16BE(i + 2);
      const b = raw.readUInt16BE(i + 4);
      const a = samplesPerPixel === 4 ? raw.readUInt16BE(i + 6) : 65535;
      rgba[j] = r >> 8;
      rgba[j + 1] = g >> 8;
      rgba[j + 2] = b >> 8;
      rgba[j + 3] = a >> 8;
    }
  }
  return { width, height, rgba };
}

function packChunk(type, data) {
  const len = data.length;
  const buf = Buffer.allocUnsafe(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, "ascii");
  data.copy(buf, 8);
  const crc = crc32(Buffer.concat([Buffer.from(type, "ascii"), data]));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function encodePngRgba(width, height, rgba) {
  const bpp = 4;
  const stride = width * bpp;
  const raw = Buffer.allocUnsafe((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idatData = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const parts = [
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    packChunk("IHDR", ihdr),
    packChunk("IDAT", idatData),
    packChunk("IEND", Buffer.alloc(0)),
  ];
  return Buffer.concat(parts);
}

function isLight(r, g, b) {
  return r >= THRESH && g >= THRESH && b >= THRESH;
}

/** Flood-fill “outside”: çok açık renk veya (palet/PNG’de) neredeyse saydam piksel. */
function isFloodBackground(r, g, b, a) {
  if (a < 28) return true;
  return isLight(r, g, b);
}

function matteFromRgba(width, height, rgba) {
  const outside = new Uint8Array(width * height);
  const q = [];
  const push = (x, y) => {
    const i = y * width + x;
    if (outside[i]) return;
    const p = i * 4;
    if (!isFloodBackground(rgba[p], rgba[p + 1], rgba[p + 2], rgba[p + 3])) return;
    outside[i] = 1;
    q.push(i);
  };

  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  while (q.length) {
    const i = q.pop();
    const x = i % width;
    const y = (i / width) | 0;
    if (x > 0) push(x - 1, y);
    if (x + 1 < width) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y + 1 < height) push(x, y + 1);
  }

  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const p = i * 4;
    if (outside[i]) {
      out[p] = 0;
      out[p + 1] = 0;
      out[p + 2] = 0;
      out[p + 3] = 0;
    } else {
      out[p] = 255;
      out[p + 1] = 255;
      out[p + 2] = 255;
      out[p + 3] = 255;
    }
  }
  return out;
}

function cornerAvgLuminance(rgba, width, height) {
  const idx = [0, width - 1, (height - 1) * width, (height - 1) * width + width - 1];
  let s = 0;
  for (const i of idx) {
    const p = i * 4;
    s += 0.2126 * rgba[p] + 0.7152 * rgba[p + 1] + 0.0722 * rgba[p + 2];
  }
  return s / idx.length;
}

/**
 * Stipple / noisy B&W: luminance → alpha (flood-fill would leak through dot gaps).
 * Auto: köşe parlaklığı düşükse koyu zemin + açık noktalar → alpha ∝ L;
 *       köşe parlaklığı yüksekse açık zemin + koyu noktalar → alpha ∝ (255−L).
 */
/** Siyah zemin + beyaz çizgi/silüet: kenara bağlı koyu alan = şeffaf, geri kalan = dolu beyaz (yüz boşluğu dolar). */
function matteFromDarkBgFlood(width, height, rgba) {
  const outside = new Uint8Array(width * height);
  const q = [];
  const push = (x, y) => {
    const i = y * width + x;
    if (outside[i]) return;
    const p = i * 4;
    const r = rgba[p];
    const g = rgba[p + 1];
    const b = rgba[p + 2];
    const a = rgba[p + 3];
    if (a < 28) {
      outside[i] = 1;
      q.push(i);
      return;
    }
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (L >= 22) return;
    outside[i] = 1;
    q.push(i);
  };

  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  while (q.length) {
    const i = q.pop();
    const x = i % width;
    const y = (i / width) | 0;
    if (x > 0) push(x - 1, y);
    if (x + 1 < width) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y + 1 < height) push(x, y + 1);
  }

  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const p = i * 4;
    if (outside[i]) {
      out[p] = out[p + 1] = out[p + 2] = out[p + 3] = 0;
    } else {
      out[p] = 255;
      out[p + 1] = 255;
      out[p + 2] = 255;
      out[p + 3] = 255;
    }
  }
  return out;
}

function matteFromStippleLuma(width, height, rgba) {
  const darkBackground = cornerAvgLuminance(rgba, width, height) < 128;
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const p = i * 4;
    const r = rgba[p];
    const g = rgba[p + 1];
    const b = rgba[p + 2];
    const srcA = rgba[p + 3];
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const rawA = darkBackground ? L : 255 - L;
    const a = Math.max(0, Math.min(255, Math.round(rawA * (srcA / 255))));
    out[p] = 255;
    out[p + 1] = 255;
    out[p + 2] = 255;
    out[p + 3] = a;
  }
  return out;
}

function main() {
  const input = process.argv[2];
  const output = process.argv[3];
  const mode = (process.argv[4] || "flood").toLowerCase();
  if (!input || !output) {
    console.error("Usage: node matte-standalone.js <input.png> <output.png> [flood|stipple|dark]");
    process.exit(1);
  }
  const buf = fs.readFileSync(input);
  const { width, height, rgba } = decodePng(buf);
  const matted =
    mode === "stipple"
      ? matteFromStippleLuma(width, height, rgba)
      : mode === "dark"
        ? matteFromDarkBgFlood(width, height, rgba)
        : matteFromRgba(width, height, rgba);
  fs.writeFileSync(output, encodePngRgba(width, height, matted));
  console.log("Wrote", output, `${width}x${height}`, mode);
}

main();
