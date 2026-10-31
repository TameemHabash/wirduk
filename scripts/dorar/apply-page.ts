/**
 * Applies one owner decision to content-source/dorar-sources.json.
 *
 *   node scripts/dorar/apply-page.ts <page.json> <dhikrId> [--fadl "<words>"] [--owner-fadl "<text>"] [--no-fadl] [--note "<why>"]
 *   node scripts/dorar/apply-page.ts --none <dhikrId> [--note "<why>"]
 *   node scripts/dorar/apply-page.ts --fadl-only <dhikrId> (--fadl "<words>" | --owner-fadl "<text>" | --no-fadl)
 *
 * <page.json> is a Dorar page saved by receiver.ts (see README.md).
 * --fadl cuts those words out of the Dorar text (exact quote); --owner-fadl
 * stores the owner's own words. Afterwards: bump APP_CONFIG.content.version
 * and run `npm run content:build`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { DorarSources } from '../content/lib/types.ts';

import {
  type FadlChoice,
  type SavedPage,
  hadithFromPage,
  setFadl,
  setNoSource,
  setSource,
} from './lib.ts';

const SOURCES = join(import.meta.dirname, '..', '..', 'content-source', 'dorar-sources.json');

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const v = args[i + 1];
  if (v === undefined || v.startsWith('--')) throw new Error(`${name} needs a value`);
  args.splice(i, 2);
  return v;
};
const has = (name: string): boolean => {
  const i = args.indexOf(name);
  if (i !== -1) args.splice(i, 1);
  return i !== -1;
};

const note = flag('--note');
const quote = flag('--fadl');
const ownerText = flag('--owner-fadl');
const noFadl = has('--no-fadl');
const none = has('--none');
const fadlOnly = has('--fadl-only');
const fadl: FadlChoice | undefined = quote
  ? { kind: 'quote', words: quote }
  : ownerText
    ? { kind: 'owner', text: ownerText }
    : noFadl
      ? { kind: 'remove' }
      : undefined;

const sources = JSON.parse(readFileSync(SOURCES, 'utf8')) as DorarSources;
const date = new Date().toISOString().slice(0, 10);

if (none || fadlOnly) {
  const dhikrId = Number(args[0]);
  if (!Number.isInteger(dhikrId)) throw new Error('Give a dhikr id');
  if (none) setNoSource(sources, dhikrId, { date, note });
  else if (fadl) setFadl(sources, dhikrId, fadl);
  else throw new Error('--fadl-only needs --fadl, --owner-fadl or --no-fadl');
} else {
  const [pagePath, id] = args;
  const dhikrId = Number(id);
  if (!pagePath || !Number.isInteger(dhikrId)) throw new Error('Give <page.json> <dhikrId>');
  const page = JSON.parse(readFileSync(pagePath, 'utf8')) as SavedPage;
  const e = setSource(sources, dhikrId, hadithFromPage(page), { date, note, fadl });
  console.log(`${e.dhikrIds.join(', ')}: ${e.hadith!.book} (${e.hadith!.number}) ${e.hadith!.url}`);
}

writeFileSync(SOURCES, JSON.stringify(sources, null, 2) + '\n');
console.log('Updated dorar-sources.json. Next: bump the content version, npm run content:build.');
