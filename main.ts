// The Passport of Auralia — an invented passport spread for a country that
// doesn't exist. Drawn 100% procedurally with Node stdlib only.
// Writes /output/entry.png and output/entry.png (repo copy).
import * as fs from "node:fs";
import * as zlib from "node:zlib";
import * as crypto from "node:crypto";

const W = 1600;
const H = 1131;

// ---------- deterministic PRNG (fixed seed) ----------
let seed = 20261121;
function rnd(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

// ---------- CRC32 ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(rgba: Buffer, w: number, h: number): Buffer {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- color ----------
type RGB = [number, number, number];
function rgb(c: RGB, a = 255): [number, number, number, number] {
  return [c[0], c[1], c[2], a];
}
const NAVY: RGB = [27, 42, 74];
const NAVY2: RGB = [18, 30, 58];
const TEAL: RGB = [15, 118, 110];
const TEAL_D: RGB = [10, 84, 78];
const GOLD: RGB = [184, 134, 11];
const GOLD_L: RGB = [201, 162, 39];
const CREAM: RGB = [246, 239, 221];
const CREAM2: RGB = [238, 228, 200];
const PAPER: RGB = [250, 246, 232];
const INK: RGB = [32, 32, 40];
const RED: RGB = [185, 28, 28];
const BLUE: RGB = [29, 78, 216];
const GREEN: RGB = [21, 128, 61];
const PURPLE: RGB = [107, 33, 168];
const SKY: RGB = [186, 220, 240];
const SKY2: RGB = [140, 190, 225];

// ---------- canvas ----------
class Canvas {
  buf: Buffer;
  constructor(public w: number, public h: number) {
    this.buf = Buffer.alloc(w * h * 4, 255);
  }
  px(x: number, y: number, c: [number, number, number, number]) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    const a = c[3] / 255;
    this.buf[i] = Math.round(c[0] * a + this.buf[i] * (1 - a));
    this.buf[i + 1] = Math.round(c[1] * a + this.buf[i + 1] * (1 - a));
    this.buf[i + 2] = Math.round(c[2] * a + this.buf[i + 2] * (1 - a));
    this.buf[i + 3] = 255;
  }
  fill(c: RGB) {
    for (let i = 0; i < this.w * this.h; i++) {
      this.buf[i * 4] = c[0]; this.buf[i * 4 + 1] = c[1]; this.buf[i * 4 + 2] = c[2]; this.buf[i * 4 + 3] = 255;
    }
  }
  rect(x: number, y: number, w: number, h: number, c: RGB, a = 255) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, rgb(c, a));
  }
  rectOutline(x: number, y: number, w: number, h: number, c: RGB, t = 1, a = 255) {
    for (let k = 0; k < t; k++) {
      this.line(x + k, y + k, x + w - 1 - k, y + k, c, a);
      this.line(x + k, y + h - 1 - k, x + w - 1 - k, y + h - 1 - k, c, a);
      this.line(x + k, y + k, x + k, y + h - 1 - k, c, a);
      this.line(x + w - 1 - k, y + k, x + w - 1 - k, y + h - 1 - k, c, a);
    }
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB, a = 255) {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, x = x0, y = y0;
    for (;;) {
      this.px(x, y, rgb(c, a));
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }
  circle(cx: number, cy: number, r: number, c: RGB, a = 255) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) this.px(cx + x, cy + y, rgb(c, a));
    }
  }
  circleOutline(cx: number, cy: number, r: number, c: RGB, t = 2, a = 255) {
    for (let k = 0; k < t; k++) {
      const rr = r - k;
      for (let deg = 0; deg < 360; deg += 0.5) {
        const rad = (deg * Math.PI) / 180;
        this.px(Math.round(cx + rr * Math.cos(rad)), Math.round(cy + rr * Math.sin(rad)), rgb(c, a));
      }
    }
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB, a = 255) {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) this.px(cx + x, cy + y, rgb(c, a));
    }
  }
  poly(points: [number, number][], c: RGB, a = 255) {
    let minY = Infinity, maxY = -Infinity;
    for (const [, y] of points) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[(i + 1) % points.length];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
          xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
        }
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) this.px(x, y, rgb(c, a));
      }
    }
  }
  vgrad(x: number, y: number, w: number, h: number, c0: RGB, c1: RGB) {
    for (let j = 0; j < h; j++) {
      const t = j / Math.max(1, h - 1);
      const c: RGB = [
        Math.round(c0[0] + (c1[0] - c0[0]) * t),
        Math.round(c0[1] + (c1[1] - c0[1]) * t),
        Math.round(c0[2] + (c1[2] - c0[2]) * t),
      ];
      for (let i = 0; i < w; i++) this.px(x + i, y + j, rgb(c));
    }
  }
  hgrad(x: number, y: number, w: number, h: number, c0: RGB, c1: RGB) {
    for (let i = 0; i < w; i++) {
      const t = i / Math.max(1, w - 1);
      const c: RGB = [
        Math.round(c0[0] + (c1[0] - c0[0]) * t),
        Math.round(c0[1] + (c1[1] - c0[1]) * t),
        Math.round(c0[2] + (c1[2] - c0[2]) * t),
      ];
      for (let j = 0; j < h; j++) this.px(x + i, y + j, rgb(c));
    }
  }
  roundRect(x: number, y: number, w: number, h: number, r: number, c: RGB, a = 255) {
    this.rect(x + r, y, w - 2 * r, h, c, a);
    this.rect(x, y + r, w, h - 2 * r, c, a);
    this.circle(x + r, y + r, r, c, a);
    this.circle(x + w - r - 1, y + r, r, c, a);
    this.circle(x + r, y + h - r - 1, r, c, a);
    this.circle(x + w - r - 1, y + h - r - 1, r, c, a);
  }
}

// ---------- 5x7 bitmap font (rows are 5-bit values, MSB = left) ----------
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  "-": [0, 0, 0, 0x0e, 0, 0, 0],
  "/": [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  "*": [0, 0x04, 0x15, 0x0e, 0x15, 0x04, 0],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  "<": [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02],
  ">": [0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08],
  "=": [0, 0, 0x1f, 0, 0x1f, 0, 0],
  "+": [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  "%": [0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03],
  '"': [0x0a, 0x0a, 0x0a, 0, 0, 0, 0],
  "#": [0x0a, 0x0a, 0x1f, 0x0a, 0x1f, 0x0a, 0x0a],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  "@": [0x0e, 0x11, 0x01, 0x0d, 0x15, 0x15, 0x0e],
  _: [0, 0, 0, 0, 0, 0, 0x1f],
  ";": [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
};

function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}
function drawText(cv: Canvas, s: string, x: number, y: number, scale: number, c: RGB, a = 255) {
  const up = s.toUpperCase();
  let cx = x;
  for (const ch of up) {
    const g = FONT[ch] ?? FONT["?"];
    for (let row = 0; row < 7; row++) {
      const bits = g[row];
      for (let col = 0; col < 5; col++) {
        if (bits & (1 << (4 - col))) {
          cv.rect(cx + col * scale, y + row * scale, scale, scale, c, a);
        }
      }
    }
    cx += 6 * scale;
  }
}
function drawTextC(cv: Canvas, s: string, cx: number, y: number, scale: number, c: RGB, a = 255) {
  drawText(cv, s, Math.round(cx - textWidth(s, scale) / 2), y, scale, c, a);
}
function drawTextR(cv: Canvas, s: string, xRight: number, y: number, scale: number, c: RGB, a = 255) {
  drawText(cv, s, xRight - textWidth(s, scale), y, scale, c, a);
}
// simple word wrap returning lines
function wrap(s: string, maxChars: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------- extra drawing helpers ----------
function arc(cv: Canvas, cx: number, cy: number, r: number, a0: number, a1: number, c: RGB, a = 255) {
  for (let deg = a0; deg <= a1; deg += 1) {
    const rad = (deg * Math.PI) / 180;
    cv.px(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), rgb(c, a));
  }
}
function guilloche(cv: Canvas, x0: number, y0: number, x1: number, y1: number, c: RGB, a: number) {
  for (let p = 0; p < 5; p++) {
    const mid = (y0 + y1) / 2;
    for (let x = x0; x <= x1; x += 2) {
      const t = (x - x0) / Math.max(1, x1 - x0);
      const y = mid + Math.sin(t * Math.PI * 6 + p * 1.3) * ((y1 - y0) / 2 - 4) * (0.6 + 0.4 * Math.sin(p * 2.1));
      cv.px(x, Math.round(y), rgb(c, a));
    }
  }
}
function diagonalText(cv: Canvas, s: string, x0: number, y0: number, dx: number, dy: number, scale: number, c: RGB, a: number) {
  let x = x0, y = y0;
  for (const ch of s.toUpperCase()) {
    drawText(cv, ch, Math.round(x), Math.round(y), scale, c, a);
    x += dx; y += dy;
  }
}
function star(cv: Canvas, cx: number, cy: number, r: number, c: RGB, a = 255) {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push([cx + rr * Math.cos(ang), cy + rr * Math.sin(ang)]);
  }
  cv.poly(pts, c, a);
}

// ---------- coat of arms ----------
function coatOfArms(cv: Canvas, cx: number, cy: number, s: number) {
  // shield
  const w = 64 * s, h = 78 * s;
  const pts: [number, number][] = [
    [cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2],
    [cx + w / 2, cy + h * 0.15], [cx, cy + h / 2], [cx - w / 2, cy + h * 0.15],
  ];
  cv.poly(pts, NAVY);
  cv.rectOutline(Math.round(cx - w / 2), Math.round(cy - h / 2), Math.round(w), Math.round(h * 0.65), GOLD, 2);
  // sun
  cv.circle(cx, Math.round(cy - h * 0.18), Math.round(13 * s), GOLD_L);
  for (let k = 0; k < 8; k++) {
    const ang = (k * Math.PI) / 4;
    cv.line(
      Math.round(cx + 17 * s * Math.cos(ang)), Math.round(cy - h * 0.18 + 17 * s * Math.sin(ang)),
      Math.round(cx + 24 * s * Math.cos(ang)), Math.round(cy - h * 0.18 + 24 * s * Math.sin(ang)), GOLD_L);
  }
  // waves
  for (let r = 0; r < 3; r++) {
    const yy = Math.round(cy + h * 0.08 + r * 9 * s);
    for (let x = Math.round(cx - w / 2 + 6); x <= Math.round(cx + w / 2 - 6); x += 2) {
      const y = yy + Math.round(Math.sin((x - cx) * 0.12) * 3 * s);
      cv.px(x, y, rgb(TEAL));
    }
  }
  // star above shield
  star(cv, cx, Math.round(cy - h / 2 - 14 * s), Math.round(9 * s), GOLD);
  // laurel dots
  for (let k = 0; k < 7; k++) {
    const t = k / 6;
    const ang = Math.PI * (0.15 + 0.7 * t);
    cv.circle(Math.round(cx - (w / 2 + 16 * s) * Math.cos(ang * 0.5) - 8 * s), Math.round(cy + 10 * s + k * 9 * s), Math.round(3 * s), TEAL);
    cv.circle(Math.round(cx + (w / 2 + 16 * s) * Math.cos(ang * 0.5) + 8 * s), Math.round(cy + 10 * s + k * 9 * s), Math.round(3 * s), TEAL);
  }
}

// ---------- portrait silhouette ----------
function portrait(cv: Canvas, x: number, y: number, w: number, h: number) {
  cv.vgrad(x, y, w, h, SKY, [250, 240, 200]);
  // sun
  cv.circle(x + w - 42, y + 44, 20, [245, 200, 90]);
  cv.circleOutline(x + w - 42, y + 44, 26, [245, 200, 90], 2, 160);
  // distant hills
  cv.poly([[x, y + h - 70], [x + w * 0.35, y + h - 110], [x + w * 0.7, y + h - 78], [x + w, y + h - 100], [x + w, y + h], [x, y + h]], [120, 170, 150]);
  // sea band
  cv.rect(x, y + h - 58, w, 58, [70, 130, 170]);
  for (let k = 0; k < 3; k++) {
    const yy = y + h - 46 + k * 16;
    for (let xx = x + 8; xx < x + w - 8; xx += 3) {
      cv.px(xx, yy + Math.round(Math.sin(xx * 0.15 + k) * 2), rgb([220, 235, 245], 150));
    }
  }
  // silhouette: head + shoulders
  const cx = x + w / 2;
  const hy = y + h * 0.42;
  cv.circle(cx, Math.round(hy), Math.round(w * 0.21), NAVY2);
  // hair: arc cap over head
  cv.poly([
    [cx - w * 0.21, hy - 6], [cx - w * 0.23, hy - w * 0.16], [cx - w * 0.1, hy - w * 0.26],
    [cx + w * 0.12, hy - w * 0.26], [cx + w * 0.23, hy - w * 0.12], [cx + w * 0.21, hy - 2],
    [cx + w * 0.14, hy - w * 0.13], [cx, hy - w * 0.17], [cx - w * 0.14, hy - w * 0.13],
  ], [12, 20, 40]);
  // neck + shoulders
  cv.poly([
    [cx - 16, hy + w * 0.16], [cx + 16, hy + w * 0.16], [cx + 26, hy + w * 0.24],
    [cx + w * 0.42, hy + w * 0.42], [cx + w * 0.46, y + h - 58], [cx - w * 0.46, y + h - 58],
    [cx - w * 0.42, hy + w * 0.42], [cx - 26, hy + w * 0.24],
  ], NAVY2);
  // collar detail
  cv.poly([[cx - 16, hy + w * 0.16], [cx, hy + w * 0.30], [cx + 16, hy + w * 0.16], [cx, hy + w * 0.20]], CREAM);
  // earring
  cv.circle(cx + Math.round(w * 0.21), Math.round(hy + 6), 3, GOLD_L);
}

// ---------- island map ----------
function islandMap(cv: Canvas, x: number, y: number, w: number, h: number) {
  cv.rect(x, y, w, h, [214, 232, 222]);
  // sea texture dots
  for (let i = 0; i < 260; i++) {
    cv.px(x + Math.floor(rnd() * w), y + Math.floor(rnd() * h), rgb([150, 180, 200], 90));
  }
  // island blob
  const cx = x + w * 0.45, cy = y + h * 0.52;
  const pts: [number, number][] = [];
  for (let deg = 0; deg < 360; deg += 12) {
    const rad = (deg * Math.PI) / 180;
    const rr = 1 + 0.28 * Math.sin(deg * 0.09 + 1.7) + 0.14 * Math.cos(deg * 0.21);
    pts.push([cx + Math.cos(rad) * w * 0.34 * rr, cy + Math.sin(rad) * h * 0.36 * rr]);
  }
  cv.poly(pts, [196, 214, 170]);
  cv.poly(pts.map(([px, py]) => [px, py] as [number, number]), [196, 214, 170]);
  // inner hills
  cv.ellipse(Math.round(cx - w * 0.08), Math.round(cy - h * 0.08), Math.round(w * 0.10), Math.round(h * 0.10), [150, 180, 130]);
  cv.ellipse(Math.round(cx + w * 0.12), Math.round(cy + h * 0.10), Math.round(w * 0.08), Math.round(h * 0.08), [150, 180, 130]);
  // towns
  const towns: [number, number, string][] = [
    [cx - w * 0.16, cy - h * 0.14, "NORTHAVEN"],
    [cx + w * 0.18, cy - h * 0.05, "KARSTAD"],
    [cx - w * 0.05, cy + h * 0.20, "MERIDIA"],
  ];
  for (const [tx, ty, name] of towns) {
    cv.circle(Math.round(tx), Math.round(ty), 4, NAVY);
    drawText(cv, name, Math.round(tx) + 8, Math.round(ty) - 4, 1, NAVY);
  }
  // capital star
  star(cv, Math.round(cx), Math.round(cy), 9, RED);
  drawText(cv, "LUMEN CITY", Math.round(cx) + 12, Math.round(cy) - 4, 1, RED);
  // compass rose
  const ccx = x + w - 34, ccy = y + 34;
  cv.circleOutline(ccx, ccy, 20, NAVY, 1, 200);
  cv.poly([[ccx, ccy - 20], [ccx + 5, ccy], [ccx, ccy + 20], [ccx - 5, ccy]], NAVY, 200);
  drawText(cv, "N", ccx - 3, ccy - 32, 1, NAVY);
  // scale bar
  cv.line(x + 14, y + h - 16, x + 74, y + h - 16, NAVY);
  cv.line(x + 14, y + h - 20, x + 14, y + h - 12, NAVY);
  cv.line(x + 74, y + h - 20, x + 74, y + h - 12, NAVY);
  drawText(cv, "0 - 50 KM", x + 80, y + h - 21, 1, NAVY);
}

// ---------- stamps ----------
function circleStamp(cv: Canvas, cx: number, cy: number, r: number, c: RGB, lines: string[], top: string, bottom: string) {
  cv.circleOutline(cx, cy, r, c, 3, 220);
  cv.circleOutline(cx, cy, r - 7, c, 1, 200);
  drawTextC(cv, top, cx, cy - r + 17, 1, c, 230);
  drawTextC(cv, bottom, cx, cy + r - 25, 1, c, 230);
  let y = cy - (lines.length * 9) / 2;
  for (const ln of lines) { drawTextC(cv, ln, cx, Math.round(y), 1, c, 235); y += 11; }
}
function rectStamp(cv: Canvas, x: number, y: number, w: number, h: number, c: RGB, lines: string[]) {
  cv.rectOutline(x, y, w, h, c, 3, 230);
  cv.rectOutline(x + 6, y + 6, w - 12, h - 12, c, 1, 200);
  let yy = y + 12;
  for (const ln of lines) { drawTextC(cv, ln, x + w / 2, yy, 1, c, 235); yy += 12; }
}

// ---------- pages ----------
function drawLeftPage(cv: Canvas) {
  const px = 70, py = 55, pw = 720, ph = 1021;
  // page + shadow
  cv.rect(px + 6, py + 8, pw, ph, [0, 0, 0], 70);
  cv.vgrad(px, py, pw, ph, PAPER, CREAM2);
  cv.rectOutline(px, py, pw, ph, GOLD, 3);
  cv.rectOutline(px + 10, py + 10, pw - 20, ph - 20, GOLD, 1, 160);
  // header
  drawTextC(cv, "REPUBLIC OF AURALIA", px + pw / 2, py + 26, 3, NAVY);
  drawTextC(cv, "MINISTRY OF THE HORIZON - PASSPORT OFFICE", px + pw / 2, py + 56, 1, TEAL_D);
  coatOfArms(cv, px + pw / 2, py + 165, 1.05);
  drawTextC(cv, "LIGHT BEYOND THE HORIZON", px + pw / 2, py + 232, 1, GOLD);
  // specimen stamp, top-right corner (clear of the header)
  rectStamp(cv, px + pw - 182, py + 24, 150, 34, RED, ["SPECIMEN"]);
  // photo
  const fx = px + 42, fy = py + 258, fw = 208, fh = 258;
  cv.rectOutline(fx - 4, fy - 4, fw + 8, fh + 8, GOLD, 2);
  portrait(cv, fx, fy, fw, fh);
  drawTextC(cv, "PHOTOGRAPH", fx + fw / 2, fy + fh + 12, 1, INK);
  drawTextC(cv, "HOLDER", px + 300, fy + 6, 1, TEAL_D);
  drawText(cv, "MARA SELINE VOSS", px + 300, fy + 24, 3, NAVY);
  drawText(cv, "BORN 14 MAR 1998 - LUMEN CITY", px + 300, fy + 58, 1, INK);
  drawText(cv, "CITIZEN NO. AUR-1998-0314", px + 300, fy + 76, 1, INK);
  // signature squiggle
  drawText(cv, "SIGNATURE", px + 300, fy + 108, 1, TEAL_D);
  const sy = fy + 150;
  for (let x = 0; x < 300; x += 2) {
    const y = sy + Math.round(Math.sin(x * 0.09) * 7 + Math.sin(x * 0.23) * 3);
    cv.px(px + 300 + x, y, rgb(INK));
    cv.px(px + 300 + x, y + 1, rgb(INK));
  }
  cv.line(px + 300, sy + 16, px + 600, sy + 16, INK, 180);
  // fingerprint whorls
  const fcx = px + 360, fcy = fy + 210;
  for (let r = 8; r <= 40; r += 7) arc(cv, fcx, fcy, r, 25 + r * 3, 335 - r * 2, INK, 170);
  drawTextC(cv, "RIGHT INDEX", fcx, fcy + 48, 1, INK);
  // hologram rings
  const hcx = px + 600, hcy = fy + 210;
  const hcols: RGB[] = [GOLD_L, TEAL, [200, 120, 180], [90, 140, 200]];
  for (let r = 40; r >= 6; r -= 7) {
    cv.circleOutline(hcx, hcy, r, hcols[(r / 7) % 4 | 0], 3, 200);
  }
  star(cv, hcx, hcy, 10, GOLD);
  drawTextC(cv, "HOLOGRAM", hcx, hcy + 48, 1, INK);
  // map
  drawText(cv, "THE ISLES OF AURALIA", px + 42, py + 570, 2, NAVY);
  drawText(cv, "SOUTHERN OCEAN - 14 20 S / 168 40 E", px + 42, py + 592, 1, TEAL_D);
  islandMap(cv, px + 42, py + 614, 636, 220);
  // guilloche band + specimen diagonal
  guilloche(cv, px + 42, py + 862, px + pw - 42, py + 886, TEAL, 130);
  diagonalText(cv, "SPECIMEN", px + 35, py + 843, 23, 9, 2, GOLD, 100);
  drawTextC(cv, "AU2026004217", px + pw / 2, py + 918, 4, NAVY);
  drawTextC(cv, "THIS PASSPORT IS THE PROPERTY OF THE REPUBLIC OF AURALIA", px + pw / 2, py + 968, 1, INK);
  drawTextC(cv, "IF FOUND PLEASE RETURN TO THE NEAREST AURALIAN CONSULATE", px + pw / 2, py + 986, 1, INK);
}

function drawRightPage(cv: Canvas) {
  const px = 810, py = 55, pw = 720, ph = 1021;
  cv.rect(px + 6, py + 8, pw, ph, [0, 0, 0], 70);
  cv.vgrad(px, py, pw, ph, PAPER, CREAM2);
  cv.rectOutline(px, py, pw, ph, GOLD, 3);
  cv.rectOutline(px + 10, py + 10, pw - 20, ph - 20, GOLD, 1, 160);
  // header
  drawTextC(cv, "PASSPORT", px + pw / 2, py + 26, 5, NAVY);
  drawTextC(cv, "PASSEPORT  -  REPUBLIC OF AURALIA", px + pw / 2, py + 74, 2, TEAL_D);
  cv.line(px + 42, py + 104, px + pw - 42, py + 104, GOLD, 255);
  cv.line(px + 42, py + 108, px + pw - 42, py + 108, GOLD, 255);
  // specimen mini stamp
  // (moved to the left page top-right corner to avoid covering the number)
  // type / code row
  drawText(cv, "TYPE", px + 42, py + 126, 1, TEAL_D);
  drawText(cv, "P", px + 42, py + 142, 3, NAVY);
  drawText(cv, "CODE", px + 200, py + 126, 1, TEAL_D);
  drawText(cv, "AUR", px + 200, py + 142, 3, NAVY);
  drawText(cv, "PASSPORT NO.", px + 360, py + 126, 1, TEAL_D);
  drawText(cv, "AU2026004217", px + 360, py + 142, 3, NAVY);
  // data fields
  const fields: [string, string, string, string][] = [
    ["SURNAME", "VOSS", "GIVEN NAMES", "MARA SELINE"],
    ["NATIONALITY", "AURALIAN", "DATE OF BIRTH", "14 MAR 1998"],
    ["PLACE OF BIRTH", "LUMEN CITY", "SEX", "F"],
    ["DATE OF ISSUE", "02 JUN 2026", "DATE OF EXPIRY", "01 JUN 2036"],
  ];
  let fy = py + 210;
  for (const [l1, v1, l2, v2] of fields) {
    drawText(cv, l1, px + 42, fy, 1, TEAL_D);
    drawText(cv, v1, px + 42, fy + 16, 2, INK);
    drawText(cv, l2, px + 380, fy, 1, TEAL_D);
    drawText(cv, v2, px + 380, fy + 16, 2, INK);
    cv.line(px + 42, fy + 44, px + pw - 42, fy + 44, [190, 180, 150], 200);
    fy += 62;
  }
  drawText(cv, "AUTHORITY", px + 42, fy, 1, TEAL_D);
  drawText(cv, "MINISTRY OF THE HORIZON - LUMEN CITY", px + 42, fy + 16, 2, INK);
  // visa sticker
  const vx = px + 42, vy = py + 510, vw = 330, vh = 232;
  cv.rectOutline(vx, vy, vw, vh, GREEN, 3);
  cv.vgrad(vx + 3, vy + 3, vw - 6, vh - 6, [210, 235, 215], [170, 205, 180]);
  // mini scene: mountains + lighthouse
  cv.poly([[vx + 10, vy + 150], [vx + 90, vy + 70], [vx + 170, vy + 150]], [90, 120, 110]);
  cv.poly([[vx + 130, vy + 150], [vx + 210, vy + 55], [vx + 290, vy + 150]], [70, 100, 95]);
  cv.circle(vx + 250, vy + 45, 16, [245, 200, 90]);
  cv.rect(vx + 300, vy + 90, 12, 60, [240, 240, 235]);
  cv.poly([[vx + 298, vy + 90], [vx + 314, vy + 90], [vx + 306, vy + 74]], RED);
  cv.line(vx + 306, vy + 82, vx + 340, vy + 60, [245, 220, 120], 200);
  cv.line(vx + 306, vy + 82, vx + 270, vy + 60, [245, 220, 120], 200);
  drawTextC(cv, "VISA", vx + vw / 2, vy + 158, 3, GREEN);
  drawTextC(cv, "KINGDOM OF NORDMARK", vx + vw / 2, vy + 184, 1, INK);
  drawTextC(cv, "VALID 90 DAYS - SINGLE ENTRY", vx + vw / 2, vy + 200, 1, INK);
  // stamps right column
  circleStamp(cv, px + 540, py + 600, 66, BLUE, ["ARRIVAL", "12 JAN 2026"], "PORT OF LUMEN", "AURALIA");
  rectStamp(cv, px + 430, py + 690, 220, 52, RED, ["DEPARTURE - KARSTAD", "03 FEB 2026"]);
  // transit oval
  cv.ellipse(px + 540, py + 800, 108, 34, PURPLE, 0);
  cv.ellipse(px + 540, py + 800, 108, 34, [0, 0, 0], 0); // noop keep bounds
  for (let deg = 0; deg < 360; deg += 1) {
    const rad = (deg * Math.PI) / 180;
    cv.px(Math.round(px + 540 + 108 * Math.cos(rad)), Math.round(py + 800 + 34 * Math.sin(rad)), rgb(PURPLE, 220));
    cv.px(Math.round(px + 540 + 100 * Math.cos(rad)), Math.round(py + 800 + 28 * Math.sin(rad)), rgb(PURPLE, 180));
  }
  drawTextC(cv, "TRANSIT - MERIDIAN GATE", px + 540, py + 793, 1, PURPLE, 230);
  // MRZ band
  const mz = py + 856;
  cv.rect(px + 42, mz, pw - 84, 96, NAVY2);
  drawText(cv, "P<AURVOSS<<MARA<SELINE<<<<<<<<<<<<<<<<<<<<<<", px + 58, mz + 16, 2, CREAM);
  drawText(cv, "AU2026004217AUR9803148F3606012<<<<<<<<<<<<<<04", px + 58, mz + 52, 2, CREAM);
  // microprint
  let mx = px + 42;
  while (mx < px + pw - 120) {
    drawText(cv, "AURALIA - ", mx, py + 972, 1, [150, 140, 115]);
    mx += textWidth("AURALIA - ", 1);
  }
  drawTextC(cv, "PAGES 12-13 - SPECIMEN DOCUMENT - NOT VALID FOR TRAVEL", px + pw / 2, py + 992, 1, INK);
}

// ---------- main ----------
function main() {
  const cv = new Canvas(W, H);
  // desk background
  cv.vgrad(0, 0, W, H, [38, 52, 82], [16, 24, 48]);
  for (let i = 0; i < 5200; i++) {
    cv.px(Math.floor(rnd() * W), Math.floor(rnd() * H), rgb([90, 110, 150], 26));
  }
  // soft vignette
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x += 7) {
      const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2);
      const d = dx * dx + dy * dy;
      if (d > 0.85) cv.px(x, y, rgb([0, 0, 0], Math.min(90, Math.round((d - 0.85) * 320))));
    }
  }
  drawLeftPage(cv);
  drawRightPage(cv);
  // center spine
  cv.rect(796, 55, 8, 1021, [0, 0, 0], 60);
  cv.rect(800, 55, 2, 1021, [0, 0, 0], 90);

  const png = encodePNG(cv.buf, W, H);
  fs.mkdirSync("/output", { recursive: true });
  fs.mkdirSync("output", { recursive: true });
  fs.writeFileSync("/output/entry.png", png);
  fs.writeFileSync("output/entry.png", png);
  const sha = crypto.createHash("sha256").update(png).digest("hex");
  console.log("bytes=" + png.length);
  console.log("sha256=" + sha);
  console.log("limit=1048576 ok=" + (png.length <= 1048576));
}
main();
