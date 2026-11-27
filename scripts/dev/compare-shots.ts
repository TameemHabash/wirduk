/**
 * Compares two folders of screenshots (from scripts/dev/e2e.ps1) pixel by pixel and lists
 * only the screens that changed, with a page to look at them.
 *
 *   node scripts/dev/compare-shots.ts [before] [after]
 *     before: default .local/shots/baseline
 *     after:  default .local/shots/latest
 *
 * Writes .local/shots/compare/index.html (before / after / diff, changed screens only) and a
 * diff picture per changed screen. Exit code 1 when a screen changed, is missing, or is new.
 * Rules in e2e/shots-compare.json: screens that change by design (shown, not counted), and
 * screens taken right after a drag (each band may line up within a few pixels first).
 * No dependencies: Android's PNGs (8-bit RGBA, not interlaced) are read with node:zlib.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { crc32, deflateSync, inflateSync } from 'node:zlib';

/** A pixel counts as changed when a channel differs by more than this (0–255). */
const CHANNEL_TOLERANCE = 24;
/** A screen counts as the same when fewer pixels than this share changed (a text cursor). */
const SAME_RATIO = 0.0005;
/** Strips at the left and right edges are not compared: scroll bars fade in and out there. */
const EDGE_PX = 16;
/** Height of the bands a scrolled screen is lined up in. */
const BAND_PX = 16;

interface Image {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel. */
  data: Buffer;
}

function readPng(file: string): Image {
  const buf = readFileSync(file);
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  while (pos < buf.length) {
    const length = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      colorType = body[9]!;
      if (body[8] !== 8 || body[12] !== 0) throw new Error(`${file}: only 8-bit, not interlaced`);
    } else if (type === 'IDAT') {
      idat.push(body);
    }
    pos += 12 + length;
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!channels) throw new Error(`${file}: color type ${colorType} not supported`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? line[x - channels]! : 0;
      const b = prev[x]!;
      const c = x >= channels ? prev[x - channels]! : 0;
      let add = 0;
      if (filter === 1) add = a;
      else if (filter === 2) add = b;
      else if (filter === 3) add = (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        add = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[x] = (line[x]! + add) & 0xff;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      out[o] = line[x * channels]!;
      out[o + 1] = line[x * channels + 1]!;
      out[o + 2] = line[x * channels + 2]!;
      out[o + 3] = channels === 4 ? line[x * channels + 3]! : 255;
    }
    prev = line;
  }
  return { width, height, data: out };
}

function writePng(file: string, img: Image): void {
  const chunk = (type: string, body: Buffer) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(body.length, 0);
    head.write(type, 4, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])) >>> 0, 0);
    return Buffer.concat([head, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.width, 0);
  ihdr.writeUInt32BE(img.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const rows = Buffer.alloc((img.width * 4 + 1) * img.height);
  for (let y = 0; y < img.height; y++) {
    img.data.copy(rows, y * (img.width * 4 + 1) + 1, y * img.width * 4, (y + 1) * img.width * 4);
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  writeFileSync(
    file,
    Buffer.concat([
      signature,
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(rows)),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}

/** Pixel (x, y) of `a` differs from pixel (x, y + dy) of `b`. */
function differs(a: Image, b: Image, x: number, y: number, dy: number): boolean {
  const yb = y + dy;
  if (yb < 0 || yb >= b.height) return true;
  const i = (y * a.width + x) * 4;
  const j = (yb * b.width + x) * 4;
  const A = a.data;
  const B = b.data;
  return (
    Math.abs(A[i]! - B[j]!) > CHANNEL_TOLERANCE ||
    Math.abs(A[i + 1]! - B[j + 1]!) > CHANNEL_TOLERANCE ||
    Math.abs(A[i + 2]! - B[j + 2]!) > CHANNEL_TOLERANCE
  );
}

/**
 * The pixel matches one of `b`'s pixels 1 px around: drawing can round an edge to the next
 * pixel from one run to the next. Nobody sees a 1 px move; a color change or a missing part
 * still counts.
 */
function nearMatch(a: Image, b: Image, x: number, y: number, dy: number): boolean {
  const i = (y * a.width + x) * 4;
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const xb = x + ox;
      const yb = y + dy + oy;
      if ((ox === 0 && oy === 0) || xb < 0 || xb >= b.width || yb < 0 || yb >= b.height) continue;
      const j = (yb * b.width + xb) * 4;
      if (
        Math.abs(a.data[i]! - b.data[j]!) <= CHANNEL_TOLERANCE &&
        Math.abs(a.data[i + 1]! - b.data[j + 1]!) <= CHANNEL_TOLERANCE &&
        Math.abs(a.data[i + 2]! - b.data[j + 2]!) <= CHANNEL_TOLERANCE
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * The vertical offset of each band of rows. 0 for a screen compared pixel by pixel. For a
 * scrolled screen (a drag can land a few pixels apart): the one offset within ±maxShift that
 * matches the whole picture best is the scroll; each band takes it, or 0 where 0 matches
 * better (the fixed top bar and tab bar).
 */
function bandOffsets(a: Image, b: Image, maxShift: number): number[] {
  const bands = Math.ceil(a.height / BAND_PX);
  if (maxShift === 0) return new Array<number>(bands).fill(0);
  const shifts = Array.from({ length: 2 * maxShift + 1 }, (_, k) => k - maxShift);
  // cost[band][k]: sampled pixels that differ in that band at shifts[k].
  const cost = Array.from({ length: bands }, (_, band) =>
    shifts.map((dy) => {
      let n = 0;
      for (let y = band * BAND_PX; y < Math.min((band + 1) * BAND_PX, a.height); y += 2) {
        for (let x = EDGE_PX; x < a.width - EDGE_PX; x += 3) if (differs(a, b, x, y, dy)) n++;
      }
      return n;
    }),
  );
  const total = shifts.map((_, k) => cost.reduce((sum, row) => sum + row[k]!, 0));
  const scroll = shifts[total.indexOf(Math.min(...total))]!;
  const zero = shifts.indexOf(0);
  const kScroll = shifts.indexOf(scroll);
  return cost.map((row) => (row[zero]! < row[kScroll]! ? 0 : scroll));
}

/** Changed pixels in red over a faded copy of the old picture. */
function diff(a: Image, b: Image, maxShift: number): { ratio: number; picture: Image } {
  const picture: Image = { width: a.width, height: a.height, data: Buffer.alloc(a.data.length) };
  const offsets = bandOffsets(a, b, maxShift);
  let changed = 0;
  for (let y = 0; y < a.height; y++) {
    const dy = offsets[Math.floor(y / BAND_PX)]!;
    for (let x = 0; x < a.width; x++) {
      const moved =
        x >= EDGE_PX &&
        x < a.width - EDGE_PX &&
        differs(a, b, x, y, dy) &&
        !nearMatch(a, b, x, y, dy);
      if (moved) changed++;
      const i = (y * a.width + x) * 4;
      const grey = 200 + (a.data[i]! + a.data[i + 1]! + a.data[i + 2]!) / 15;
      picture.data[i] = moved ? 230 : grey;
      picture.data[i + 1] = moved ? 30 : grey;
      picture.data[i + 2] = moved ? 30 : grey;
      picture.data[i + 3] = 255;
    }
  }
  return { ratio: changed / (a.width * a.height), picture };
}

const root = resolve(import.meta.dirname, '..', '..');
const before = resolve(process.argv[2] ?? join(root, '.local/shots/baseline'));
const after = resolve(process.argv[3] ?? join(root, '.local/shots/latest'));
const outDir = join(root, '.local/shots/compare');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const pngs = (dir: string) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.png'))
        .sort()
    : [];
const names = [...new Set([...pngs(before), ...pngs(after)])].sort();
const rules = JSON.parse(readFileSync(join(root, 'e2e/shots-compare.json'), 'utf8')) as {
  maxShift: number;
  varying: Record<string, string>;
  scrolled: string[];
};
const varying = new Map(Object.entries(rules.varying));
const scrolled = new Set(rules.scrolled);
const rows: string[] = [];
let same = 0;
let problems = 0;
for (const name of names) {
  const a = join(before, name);
  const b = join(after, name);
  if (!existsSync(a) || !existsSync(b)) {
    problems++;
    console.log(`${existsSync(a) ? 'MISSING' : 'NEW    '} ${name}`);
    rows.push(
      `<tr><td>${name}</td><td colspan="3">${existsSync(a) ? 'missing now' : 'new'}</td></tr>`,
    );
    continue;
  }
  const ia = readPng(a);
  const ib = readPng(b);
  if (ia.width !== ib.width || ia.height !== ib.height) {
    problems++;
    console.log(`SIZE    ${name}: ${ia.width}x${ia.height} -> ${ib.width}x${ib.height}`);
    continue;
  }
  const { ratio, picture } = diff(ia, ib, scrolled.has(name) ? rules.maxShift : 0);
  if (ratio < SAME_RATIO) {
    same++;
    continue;
  }
  const why = varying.get(name);
  if (!why) problems++;
  const diffName = `diff-${basename(name)}`;
  writePng(join(outDir, diffName), picture);
  const pct = (ratio * 100).toFixed(2);
  console.log(why ? `VARIES  ${name}: ${why}` : `CHANGED ${name}: ${pct}% of pixels`);
  const img = (src: string) => `<img src="${relative(outDir, src).replace(/\\/g, '/')}">`;
  rows.push(
    `<tr><td>${name}<br>${why ? `varies by design: ${why}` : `${pct}%`}</td><td>${img(a)}</td><td>${img(b)}</td><td>${img(join(outDir, diffName))}</td></tr>`,
  );
}

writeFileSync(
  join(outDir, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>Screens compare</title>
<style>body{font:14px system-ui;margin:16px}img{width:270px;border:1px solid #ccc}td{vertical-align:top;padding:4px}</style>
<h1>${problems} changed, ${same} the same</h1><p>Before: ${before}<br>After: ${after}</p>
<table><tr><th></th><th>Before</th><th>After</th><th>Diff</th></tr>${rows.join('\n')}</table>`,
);
console.log(
  `${same} the same, ${problems} changed or missing. Page: ${join(outDir, 'index.html')}`,
);
process.exit(problems > 0 ? 1 : 0);
