/**
 * docs/adwamuha/states.md lists every state of «أدومها» and the tests that reach it
 * (milestone 13). This keeps the list honest: a state with no test, a test file that does not
 * exist (renamed, split), or a scenario label with no scenario of that name fails here.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..', '..', '..', '..');
const doc = readFileSync(join(root, 'docs', 'adwamuha', 'states.md'), 'utf8');

/** Every test file under src/ and scripts/, by its name. */
function testFiles(dir: string, out = new Map<string, string>()): Map<string, string> {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) testFiles(path, out);
    else if (/\.test\.tsx?$/.test(name)) out.set(name, path);
  }
  return out;
}
const files = testFiles(join(root, 'src'));

/** The table's rows: the state and its tests column. */
const rows = doc
  .split('\n')
  .filter((l) => l.startsWith('| ') && !l.startsWith('| State') && !l.startsWith('| ---'))
  .map((l) => l.split('|').map((c) => c.trim()))
  .map((cells) => ({ state: cells[1]!, tests: cells[4]! }));

/** `scenarios (a, b)` → the labels; `plan-walk` → its file; `x.test.tsx` → itself. */
function refsOf(tests: string) {
  const out: { file: string; labels: string[] }[] = [];
  for (const m of tests.matchAll(/`([\w.-]+)`(?:\s*\(([^)]*)\))?/g)) {
    const name = m[1]!;
    const file = /\.test\.tsx?$/.test(name)
      ? name
      : ([`${name}.test.ts`, `${name}.test.tsx`].find((f) => files.has(f)) ?? `${name}.test.*`);
    const labels = (m[2] ?? '')
      .split(/,|;/)
      .map((x) => x.trim())
      .filter(Boolean);
    out.push({ file, labels });
  }
  return out;
}

/** The titles of a test file's describe / it blocks. */
function titlesOf(path: string): string[] {
  const text = readFileSync(path, 'utf8');
  return [...text.matchAll(/\b(?:describe|it)(?:\.each\([^)]*\))?\(\s*(['"`])(.+?)\1/g)].map((m) =>
    m[2]!.toLowerCase(),
  );
}

describe('docs/adwamuha/states.md', () => {
  it('has the states table', () => {
    expect(rows.length).toBeGreaterThan(30);
  });

  it.each(rows.map((r) => [r.state, r.tests]))('%s: names its tests', (_state, tests) => {
    expect(refsOf(tests).length).toBeGreaterThan(0);
  });

  it.each(rows.map((r) => [r.state, r.tests]))(
    '%s: every test it names exists',
    (_state, tests) => {
      for (const { file } of refsOf(tests)) {
        expect({ file, exists: files.has(file) }).toEqual({ file, exists: true });
      }
    },
  );

  it.each(rows.map((r) => [r.state, r.tests]))(
    '%s: every scenario it names is a test of that name',
    (_state, tests) => {
      for (const { file, labels } of refsOf(tests)) {
        if (labels.length === 0 || !files.has(file)) continue;
        const titles = titlesOf(files.get(file)!);
        for (const label of labels) {
          const found = titles.some((t) => t.includes(label.toLowerCase()));
          expect({ file, label, found }).toEqual({ file, label, found: true });
        }
      }
    },
  );
});
