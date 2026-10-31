import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  STRINGS_FILE,
  applyDesignStrings,
  designEdits,
  designStrings,
  setupStrings,
} from './design-strings';
import { DESIGN_FILE, EDITS_FILE } from './owner-texts';

const root = join(__dirname, '..', '..');
const read = (file: string) => readFileSync(join(root, file), 'utf8');
const design = read(DESIGN_FILE);
const edits = designEdits(read(EDITS_FILE));

describe("the design's strings in the app", () => {
  it('common.json has exactly what the design gives (run the script after a change)', () => {
    const strings = JSON.parse(read(STRINGS_FILE)) as Record<string, Record<string, unknown>>;
    expect(applyDesignStrings(strings, design, edits)).toEqual(strings);
  });

  it("the setup's texts are found, and the 4-of-7 line keeps the owner's words first", () => {
    const setup = setupStrings(design, edits.intent);
    expect(Object.values(setup).every((s) => s.length > 0)).toBe(true);
    expect(setup.point3Note!.startsWith(`${edits.intent}، `)).toBe(true);
  });

  it("the owner's fixes replace their words in the design's text (owner, 2026-10-30)", () => {
    expect(edits.fixes.map((f) => f.key)).toEqual(['setup.fromFirst', 'home.fullAdhkar']);
    const fixed = designStrings(design, edits);
    const plain = designStrings(design, { ...edits, fixes: [] });
    for (const { key, from, to } of edits.fixes) {
      const [group, name] = key.split('.') as [string, string];
      expect(fixed[group]![name]).toBe(plain[group]![name]!.replace(from, to));
      expect(fixed[group]![name]).not.toContain(from);
    }
  });

  it('fails clearly when the design changes shape', () => {
    expect(() => setupStrings('<html></html>', edits.intent)).toThrow(
      /Not found in the owner's design/,
    );
    const stale = { ...edits, fixes: [{ key: 'setup.next', from: 'x', to: 'y' }] };
    expect(() => designStrings(design, stale)).toThrow(/no longer matches the design/);
  });
});
