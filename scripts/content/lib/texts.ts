/**
 * Adwamuha's own messages and tips in the content build. Read from
 * `content-source/adwamuha-texts.json` (written by
 * `scripts/adwamuha/owner-texts.ts`), checked on every build, written to the
 * table AdwamuhaTexts.
 */
import { ADWAMUHA_MOMENTS } from '../../../src/data/models.ts';

import type { ContentText } from './types.ts';

/** Shape of `content-source/adwamuha-texts.json`. */
export interface TextsFile {
  note: string;
  texts: Omit<ContentText, 'lang'>[];
}

const SESSIONS = ['morning', 'evening'];

/** The states a moment's texts may have (see the AdwamuhaTexts table). */
function validState(moment: string, state: string): boolean {
  if (moment === 'tip') return /^stage:[1-9]\d*$/.test(state) || state === 'maintenance';
  if (moment === 'welcome') {
    const [start, session] = state.split(':');
    return (start === 'first' || start === 'later') && SESSIONS.includes(session ?? '');
  }
  return (ADWAMUHA_MOMENTS as readonly string[]).includes(moment) && state === '';
}

/** Checks the file and returns its texts in `lang`; throws with every problem found. */
export function validateTexts(file: TextsFile, lang: string): ContentText[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const states = new Set<string>();
  for (const t of file.texts) {
    if (ids.has(t.id)) problems.push(`${t.id}: the id is used twice`);
    ids.add(t.id);
    if (!validState(t.moment, t.state))
      problems.push(`${t.id}: unknown "${t.moment}" / "${t.state}"`);
    if (!t.text.trim()) problems.push(`${t.id}: no text`);
    if (!['owner', 'design', 'claude'].includes(t.author)) {
      problems.push(`${t.id}: unknown author "${t.author}"`);
    }
    // A tip or a welcome is chosen by its state: one text each.
    if (t.state) {
      const key = `${t.moment} ${t.state}`;
      if (states.has(key)) problems.push(`${t.id}: a second text for ${key}`);
      states.add(key);
    }
  }
  for (const moment of ADWAMUHA_MOMENTS) {
    if (!file.texts.some((t) => t.moment === moment)) problems.push(`no text for "${moment}"`);
  }
  for (const start of ['first', 'later']) {
    for (const session of SESSIONS) {
      if (!states.has(`welcome ${start}:${session}`)) {
        problems.push(`no welcome for ${start}:${session}`);
      }
    }
  }
  if (problems.length > 0) {
    throw new Error(`Adwamuha texts check failed:\n- ${problems.join('\n- ')}`);
  }
  return file.texts.map((t) => ({ lang, ...t }));
}
