#!/usr/bin/env node
/** Dark grey lines on black (crushed export) → bright lines on black, Sabri/Tarık mask uyumu. */
"use strict";

const fs = require("fs");
const zlib = require("zlib");

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
    } else if (ch.type === "PLTE") {
      palette = ch.data;
    } else if (ch.type === "tRNS") {
      trns = ch.data;
    } else if (ch.type === "IDAT") idat.push(ch.data);
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
  if (!spp) throw new Error("Need RGB/RGBA or indexed PNG");
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

function encodePngRgb(width, height, rgb) {
  const stride = width * 3;
  const raw = Buffer.allocUnsafe((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    packChunk("IHDR", ihdr),
    packChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    packChunk("IEND", Buffer.alloc(0)),
  ]);
}

function lift(width, height, rgba) {
  const n = width * height;
  let peak = 0;
  const L = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    const l = 0.2126 * rgba[p] + 0.7152 * rgba[p + 1] + 0.0722 * rgba[p + 2];
    L[i] = l;
    if (l > peak) peak = l;
  }
  if (peak < 8) throw new Error("Image has no drawable lines (peak L too low)");
  const target = 239;
  const floor = 3;
  const rgb = Buffer.alloc(n * 3);
  for (let i = 0; i < n; i++) {
    const o = i * 3;
    const l = L[i];
    if (l <= floor) {
      rgb[o] = rgb[o + 1] = rgb[o + 2] = 0;
    } else {
      const norm = (l - floor) / (peak - floor);
      const v = Math.min(255, Math.round(Math.pow(norm, 0.55) * target));
      rgb[o] = rgb[o + 1] = rgb[o + 2] = v;
    }
  }
  return rgb;
}

const input = process.argv[2];
const output = process.argv[3];
if (!input || !output) {
  console.error("Usage: node lift-crushed-lines.js <input.png> <output.png>");
  process.exit(1);
}
const { width, height, rgba } = decodePng(fs.readFileSync(input));
fs.writeFileSync(output, encodePngRgb(width, height, lift(width, height, rgba)));
console.log("Wrote", output, `${width}x${height}`);
