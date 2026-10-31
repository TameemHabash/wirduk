/**
 * Reads or changes the level of a 16-bit PCM WAV (the tick sound).
 *
 *   node scripts/dev/wav-level.ts <in.wav>                         print rate, length, peak, RMS
 *   node scripts/dev/wav-level.ts <in.wav> <out.wav> <peak> [drive]
 *
 * The second form scales the sound so its peak is <peak> (0–1, e.g. 0.97). With
 * [drive] > 1 it first shapes the wave softly (tanh), so it sounds louder at the
 * same peak, without hard clipping.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [input, output, peakArg, driveArg] = process.argv.slice(2);
if (!input) throw new Error('Usage: wav-level.ts <in.wav> [<out.wav> <peak> [drive]]');
const buf = readFileSync(input);

// Find the "fmt " and "data" chunks.
let fmt = -1;
let data = -1;
let dataLen = 0;
for (let p = 12; p + 8 <= buf.length;) {
  const id = buf.toString('ascii', p, p + 4);
  const len = buf.readUInt32LE(p + 4);
  if (id === 'fmt ') fmt = p + 8;
  if (id === 'data') {
    data = p + 8;
    dataLen = len;
    break;
  }
  p += 8 + len + (len % 2);
}
if (fmt < 0 || data < 0) throw new Error('Not a WAV file');
const format = buf.readUInt16LE(fmt);
const channels = buf.readUInt16LE(fmt + 2);
const rate = buf.readUInt32LE(fmt + 4);
const bits = buf.readUInt16LE(fmt + 14);
if (format !== 1 || bits !== 16)
  throw new Error(`Only 16-bit PCM (got format ${format}, ${bits} bits)`);

const n = dataLen / 2;
const samples = new Float64Array(n);
for (let i = 0; i < n; i++) samples[i] = buf.readInt16LE(data + i * 2) / 32768;

const stats = (s: Float64Array) => {
  let peak = 0;
  let sum = 0;
  for (const v of s) {
    peak = Math.max(peak, Math.abs(v));
    sum += v * v;
  }
  const db = (x: number) => (x > 0 ? (20 * Math.log10(x)).toFixed(1) : '-inf');
  return `peak ${peak.toFixed(3)} (${db(peak)} dBFS), RMS ${db(Math.sqrt(sum / s.length))} dBFS`;
};
console.log(
  `${input}: ${rate} Hz, ${channels} ch, ${((n / channels / rate) * 1000).toFixed(0)} ms; ${stats(samples)}`,
);

if (output) {
  const target = Number(peakArg);
  const drive = Number(driveArg ?? 1);
  if (!(target > 0 && target <= 1) || !(drive >= 1)) throw new Error('peak must be 0–1, drive ≥ 1');
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  const shaped = samples.map((v) => (drive > 1 ? Math.tanh((drive * v) / peak) : v / peak));
  let shapedPeak = 0;
  for (const v of shaped) shapedPeak = Math.max(shapedPeak, Math.abs(v));
  const out = Buffer.from(buf);
  for (let i = 0; i < n; i++) {
    const v = Math.round((shaped[i]! / shapedPeak) * target * 32767);
    out.writeInt16LE(Math.max(-32768, Math.min(32767, v)), data + i * 2);
  }
  writeFileSync(output, out);
  const check = new Float64Array(n);
  for (let i = 0; i < n; i++) check[i] = out.readInt16LE(data + i * 2) / 32768;
  console.log(`${output}: ${stats(check)}`);
}
