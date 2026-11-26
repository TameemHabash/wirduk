import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { resources } from './resources';

interface Word {
  key: string;
  text: string;
}

/**
 * The owner's words in the redesign (2026-11-26) are cut from their messages by script and
 * recorded in docs/adwamuha/owner-edits.json; the app's strings must say exactly that.
 */
describe("the owner's redesign words", () => {
  const edits = JSON.parse(
    readFileSync(join(process.cwd(), 'docs', 'adwamuha', 'owner-edits.json'), 'utf8'),
  ) as { redesign: { words: Word[] } };
  const ar = resources.ar.common as unknown as Record<string, unknown>;
  const lookup = (key: string) =>
    key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], ar);

  it.each(edits.redesign.words.map((w) => [w.key, w.text]))(
    '%s is the owner’s text',
    (key, text) => {
      expect(lookup(key)).toBe(text);
    },
  );
});
