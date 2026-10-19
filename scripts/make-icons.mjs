// Generates the PWA icons (PNG) and favicon (SVG) without any dependencies.
// Design: dark rounded square, a countdown ring three-quarters full, a dot at the arc's tip.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [11, 13, 18];
const TRACK = [38, 44, 58];
const RING = [63, 81, 181]; // blueberry
const TIP = [51, 182, 121]; // sage

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Sample the design at normalized coords (0..1). Returns [r,g,b,a]. */
function sample(u, v, { rounded, scale }) {
  // Background with rounded corners (or full bleed for maskable).
  const r = 0.22;
  const inRect = (() => {
    if (!rounded) return true;
    const cx = Math.min(Math.max(u, r), 1 - r);
    const cy = Math.min(Math.max(v, r), 1 - r);
    return (u - cx) ** 2 + (v - cy) ** 2 <= r * r;
  })();
  if (!inRect) return [0, 0, 0, 0];
  const x = (u - 0.5) / scale;
  const y = (v - 0.5) / scale;
  const d = Math.hypot(x, y);
  const R = 0.3;
  const W = 0.075;
  // Angle from 12 o'clock, clockwise, 0..1.
  let ang = Math.atan2(x, -y) / (2 * Math.PI);
  if (ang < 0) ang += 1;
  const tipAng = 0.75 * 2 * Math.PI;
  const tipX = Math.sin(tipAng) * R;
  const tipY = -Math.cos(tipAng) * R;
  if (Math.hypot(x - tipX, y - tipY) < W * 0.95) return [...TIP, 255];
  if (Math.abs(d - R) < W / 2) return ang <= 0.75 ? [...RING, 255] : [...TRACK, 255];
  if (d < 0.07) return [...TIP, 255];
  return [...BG, 255];
}

function render(size, opts) {
  const SS = 4;
  return png(size, (px, py) => {
    const acc = [0, 0, 0, 0];
    for (let sy = 0; sy < SS; sy++)
      for (let sx = 0; sx < SS; sx++) {
        const c = sample((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size, opts);
        acc[0] += c[0] * c[3];
        acc[1] += c[1] * c[3];
        acc[2] += c[2] * c[3];
        acc[3] += c[3];
      }
    const a = acc[3] / (SS * SS);
    return a === 0 ? [0, 0, 0, 0] : [acc[0] / acc[3], acc[1] / acc[3], acc[2] / acc[3], a].map(Math.round);
  });
}

writeFileSync('public/pwa-192.png', render(192, { rounded: true, scale: 1 }));
writeFileSync('public/pwa-512.png', render(512, { rounded: true, scale: 1 }));
// Maskable: full bleed, artwork inside the 80% safe zone.
writeFileSync('public/pwa-maskable-512.png', render(512, { rounded: false, scale: 0.8 }));
// iOS applies its own corner mask.
writeFileSync('public/apple-touch-icon.png', render(180, { rounded: false, scale: 0.9 }));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<rect width="100" height="100" rx="22" fill="#0b0d12"/>
<circle cx="50" cy="50" r="30" fill="none" stroke="#262c3a" stroke-width="7.5"/>
<path d="M50 20 A30 30 0 1 1 20 50" fill="none" stroke="#3F51B5" stroke-width="7.5" stroke-linecap="round"/>
<circle cx="20" cy="50" r="7" fill="#33B679"/>
<circle cx="50" cy="50" r="7" fill="#33B679"/>
</svg>
`;
writeFileSync('public/favicon.svg', svg);
console.log('icons written to public/');
