import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  type ClaudeDrafts,
  DESIGN_FILE,
  DRAFTS_FILE,
  EDITS_FILE,
  MODULE_FILE,
  type OwnerEdits,
  PROMPT_FILE,
  TEXTS_FILE,
  extractDesignTexts,
  extractOwnerTexts,
  extractTextRows,
  renderOwnerTexts,
  renderTextRows,
} from './owner-texts';

const root = join(__dirname, '..', '..');
const read = (file: string) => readFileSync(join(root, file), 'utf8');
const prompt = read(PROMPT_FILE);
const design = read(DESIGN_FILE);
const edits = JSON.parse(read(EDITS_FILE)) as OwnerEdits;
const drafts = JSON.parse(read(DRAFTS_FILE)) as ClaudeDrafts;

describe("the owner's texts for Adwamuha", () => {
  it('the app module and the texts file are exactly what the inputs give (run the script after a change)', () => {
    expect(read(MODULE_FILE)).toBe(renderOwnerTexts(prompt, edits));
    expect(read(TEXTS_FILE)).toBe(renderTextRows(prompt, design, drafts));
  });

  it('finds every label, the 8 messages, the 4 tips and the hadith card', () => {
    const texts = extractOwnerTexts(prompt, edits);
    expect(Object.values(texts.labels).every((s) => (s ?? '').length > 0)).toBe(true);
    expect(texts.labels.stepOf).toMatch(/\{\{step\}\}.*\{\{total\}\}/);
    expect(Object.keys(texts.messages).sort()).toEqual(
      [
        'afterStepBack',
        'bothDone',
        'extended',
        'finished',
        'newStep',
        'wardDone',
        'weekBelow',
        'weekReached',
      ].sort(),
    );
    expect(Object.keys(texts.tips)).toEqual(['1', '2', '3', '4']);
  });

  it('the module keeps only the labels and the hadith (the messages are in the database)', () => {
    expect(read(MODULE_FILE)).not.toMatch(/"messages"|"tips"/);
  });

  it("the hadith is the owner's edit: their text, no source line on screen, Dorar's data kept", () => {
    const { hadith } = extractOwnerTexts(prompt, edits);
    expect(hadith.text).toBe(edits.hadithCard!.text);
    expect(hadith.showSource).toBe(false);
    expect(hadith.source).toBe(edits.hadithCard!.source);
    expect(hadith.dorar.url).toBe('https://dorar.net/hadith/sharh/113728');
    expect(edits.hadithCard!.link).toBe(false);
    // The description's words, with one shadda added on the word Allah (owner, 2026-10-29).
    const lamShaddaHeh = String.fromCodePoint(0x644, 0x651, 0x647);
    const lamHeh = String.fromCodePoint(0x644, 0x647);
    expect(hadith.text).toContain(lamShaddaHeh);
    expect(hadith.text.replace(lamShaddaHeh, lamHeh).normalize('NFC')).toBe(
      hadith.dorar.text.normalize('NFC'),
    );
  });

  it('fails clearly when the description changes shape', () => {
    expect(() => extractOwnerTexts('# nothing here')).toThrow(/Not found/);
  });
});

describe('the messages and tips for the content database', () => {
  const rows = extractTextRows(prompt, design, drafts);
  const owner = extractOwnerTexts(prompt, edits);
  const d = extractDesignTexts(design);
  const byId = new Map(rows.map((r) => [r.id, r]));

  it("the owner's 8 messages and 4 tips, word for word, each with its moment or stage", () => {
    for (const [moment, text] of Object.entries(owner.messages)) {
      expect(byId.get(`owner:${moment}`)).toEqual({
        id: `owner:${moment}`,
        moment,
        state: '',
        text,
        author: 'owner',
      });
    }
    for (const [stage, text] of Object.entries(owner.tips)) {
      expect(byId.get(`owner:tip:${stage}`)).toMatchObject({ state: `stage:${stage}`, text });
    }
  });

  it("the design's maintenance tip and welcome; a morning start says the morning ward", () => {
    expect(byId.get('design:tip:maintenance')).toMatchObject({
      moment: 'tip',
      state: 'maintenance',
      text: d.maintenanceTip,
      author: 'design',
    });
    expect(byId.get('design:welcome:first:evening')!.text).toBe(d.welcome);
    const morning = byId.get('design:welcome:first:morning')!.text;
    expect(morning).toBe(d.welcome.replace(d.eveningWord, d.morningWord));
    expect(morning).not.toBe(d.welcome);
  });

  it("a later start: the design's greeting and last sentence around Claude's sentence", () => {
    const later = byId.get('claude:welcome:later:evening')!;
    expect(later.author).toBe('claude');
    const [greeting, , beginWith] = d.welcome.split(/(?<=\.) /);
    expect(later.text).toBe(`${greeting} ${drafts.welcomeLater} ${beginWith}`);
  });

  it("refuses a design whose copy of an owner's text differs from the description", () => {
    const changed = design.replace(owner.messages.bothDone!, `${owner.messages.bothDone} !`);
    expect(() => extractTextRows(prompt, changed, drafts)).toThrow(/day_done_message differs/);
  });
});
