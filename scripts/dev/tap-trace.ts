/**
 * Reads an atrace text dump (scripts/dev/e2e.ps1, Measure-E2eLatency) taken around one tap and
 * prints, as JSON: how long after the tap the app drew the frame that shows the result, and how
 * busy its JS thread was.
 *
 *   node scripts/dev/tap-trace.ts <trace.txt> <app pid> <JS thread id>
 *
 * - tap: the start of the last input event the app's main thread got (the finger going up).
 * - burstMs: the JS thread's work from the tap until it rests for 20 ms or more (short pauses,
 *   a few ms, happen inside a render): the render of the new screen. Work it does later (a
 *   list drawing more rows on its timer) is not in it.
 * - frameMs: from the tap to the end of the first frame the app's RenderThread drew after that
 *   burst (the UI thread builds the views in between): when the user sees the new screen. Only
 *   meaningful when the burst changes the screen (a screen shown again may draw nothing new).
 * - jsBusyMs: all the JS thread's work in the 2 seconds after the tap.
 * - --timeline also prints the first second: each JS run and each frame, in ms from the tap.
 */
import { readFileSync } from 'node:fs';

const [file, pidArg, jsArg] = process.argv.slice(2);
if (!file || !pidArg || !jsArg) {
  console.error('usage: node scripts/dev/tap-trace.ts <trace.txt> <app pid> <JS thread id>');
  process.exit(2);
}
const pid = Number(pidArg);
const jsTid = Number(jsArg);

/** "<comm>-<tid> (<tgid>) [cpu] <flags> <seconds>: <event>: <body>" (tgid and flags optional). */
const LINE =
  /^\s*(.*?)-(\d+)\s+(?:\(\s*[\d-]+\)\s+)?\[\d+\]\s+(?:\S{4,5}\s+)?([\d.]+):\s+(\w+):\s+(.*)$/;

interface Slice {
  tid: number;
  name: string;
  start: number;
  end: number;
}

const slices: Slice[] = [];
const open = new Map<number, { name: string; start: number }[]>();
/** The JS thread's runs on a CPU: start and end in ms, and whether it then slept. */
const runs: { start: number; end: number; slept: boolean }[] = [];
let runningSince: number | null = null;
let renderThread = -1;

for (const line of readFileSync(file, 'utf8').split('\n')) {
  const m = LINE.exec(line);
  if (!m) continue;
  const tid = Number(m[2]);
  const t = Number(m[3]) * 1000;
  const event = m[4];
  const body = m[5]!;
  if (event === 'sched_switch') {
    const prev = /prev_pid=(\d+)/.exec(body);
    const next = /next_pid=(\d+)/.exec(body);
    if (prev && Number(prev[1]) === jsTid && runningSince !== null) {
      const state = /prev_state=(\S+)/.exec(body)?.[1] ?? '';
      runs.push({ start: runningSince, end: t, slept: state.startsWith('S') });
      runningSince = null;
    }
    if (next && Number(next[1]) === jsTid) runningSince = t;
  } else if (event === 'tracing_mark_write') {
    const parts = body.split('|');
    if (Number(parts[1]) !== pid) continue;
    const stack = open.get(tid) ?? [];
    open.set(tid, stack);
    if (parts[0] === 'B') {
      const name = parts.slice(2).join('|').trim();
      if (name.startsWith('DrawFrame')) renderThread = tid;
      stack.push({ name, start: t });
    } else if (parts[0] === 'E') {
      const s = stack.pop();
      if (s) slices.push({ tid, name: s.name, start: s.start, end: t });
    }
  }
}

const inputs = slices.filter((s) => s.tid === pid && s.name.startsWith('deliverInputEvent'));
const tap = inputs.at(-1)?.start;
if (tap === undefined) {
  console.error('No input event of the app in the trace.');
  process.exit(1);
}

const after = runs.filter((r) => r.end > tap).map((r) => ({ ...r, start: Math.max(r.start, tap) }));
/** A rest at least this long ends the burst. */
const REST_MS = 20;
let burstEnd = tap;
let burstMs = 0;
for (const r of after) {
  if (burstMs > 0 && r.start - burstEnd >= REST_MS) break;
  burstMs += r.end - r.start;
  burstEnd = r.end;
}
const jsBusyMs = after
  .filter((r) => r.start < tap + 2000)
  .reduce((n, r) => n + Math.min(r.end, tap + 2000) - r.start, 0);
const frame = slices
  .filter((s) => s.tid === renderThread && s.name.startsWith('DrawFrame') && s.start >= burstEnd)
  .sort((a, b) => a.start - b.start)[0];

if (process.argv.includes('--timeline')) {
  // The first second after the tap: the JS thread's runs and the frames, in ms from the tap.
  const at = (t: number) => (t - tap).toFixed(1).padStart(7);
  const events = [
    ...after
      .filter((r) => r.start < tap + 1000)
      .map((r) => ({
        t: r.start,
        text: `JS    ${at(r.start)} +${(r.end - r.start).toFixed(1)}${r.slept ? ' sleeps' : ''}`,
      })),
    ...slices
      .filter((s) => s.tid === renderThread && s.name.startsWith('DrawFrame'))
      .filter((s) => s.start >= tap && s.start < tap + 1000)
      .map((s) => ({ t: s.start, text: `FRAME ${at(s.start)} +${(s.end - s.start).toFixed(1)}` })),
  ].sort((a, b) => a.t - b.t);
  for (const e of events) console.log(e.text);
}

console.log(
  JSON.stringify({
    frameMs: frame ? Math.round(frame.end - tap) : null,
    burstMs: Math.round(burstMs),
    jsBusyMs: Math.round(jsBusyMs),
  }),
);
