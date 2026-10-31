/**
 * Cuts the owner's own texts for Adwamuha out of the owner's description
 * (`docs/adwamuha/feature-prompt.md`) and the owner's design
 * (`docs/adwamuha/flow-design.html`), so no Arabic is typed by hand:
 * - the labels and the hadith go into a module the app uses
 *   (`src/features/adwamuha/owner-texts.ts`);
 * - the messages and tips (each one chosen by state) go into
 *   `content-source/adwamuha-texts.json`, which the content build writes into
 *   the content database (owner, 2026-10-29: «store each placeholder in the DB»).
 * Each text is found by the English words around it in the description, or by
 * its placeholder name in the design.
 *
 *   node scripts/adwamuha/owner-texts.ts          write both
 *   node scripts/adwamuha/owner-texts.ts --check  fail if either is out of date
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** The inputs and the generated files, from the repo's root folder. */
export const PROMPT_FILE = join('docs', 'adwamuha', 'feature-prompt.md');
export const DESIGN_FILE = join('docs', 'adwamuha', 'flow-design.html');
export const MODULE_FILE = join('src', 'features', 'adwamuha', 'owner-texts.ts');
export const TEXTS_FILE = join('content-source', 'adwamuha-texts.json');
/** The owner's later edits, given in chat (cut from the messages by script). */
export const EDITS_FILE = join('docs', 'adwamuha', 'owner-edits.json');
/** Claude's own words where no text exists, for the owner's review. */
export const DRAFTS_FILE = join('docs', 'adwamuha', 'claude-drafts.json');

export interface OwnerEdits {
  /**
   * The light-plan hadith card: the owner's text (2026-10-25, a shadda on the word Allah
   * 2026-10-29), their source line (stored, not shown since 2026-10-29), no link.
   */
  hadithCard?: {
    date: string;
    text: string;
    source: string;
    link: boolean;
    showSource?: boolean;
  };
  /** The owner's words at the start of the setup's 4-of-7 line (used by design-strings.ts). */
  setupIntent?: { date: string; note: string; text: string };
  /** The owner's fixes to the design's interface texts (used by design-strings.ts). */
  designFixes?: { date: string; note: string; fixes: { key: string; from: string; to: string }[] };
  /** Names shown instead of a dhikr's first words (owner, 2026-10-30), with its plan ids. */
  wardNames?: { date: string; note: string; names: { ids: number[]; name: string }[] };
}

export interface ClaudeDrafts {
  /** The middle sentence of the welcome for a start at a later step. */
  welcomeLater: string;
}

/** One message or tip, with the moment and the state it is shown in. */
export interface AdwamuhaTextRow {
  id: string;
  /** A message moment (e.g. 'wardDone'), 'welcome' or 'tip'. */
  moment: string;
  /**
   * '' for a message; for a tip 'stage:N' or 'maintenance'; for the welcome
   * '<first|later>:<morning|evening>' (the starting step, the ward open then).
   */
  state: string;
  text: string;
  /** Whose words: the description ('owner'), the design ('design'), or partly Claude's. */
  author: 'owner' | 'design' | 'claude';
}

function find(text: string, re: RegExp, what: string, where = "the owner's description"): string[] {
  const m = re.exec(text);
  if (!m) throw new Error(`Not found in ${where}: ${what}`);
  return m.slice(1).map((s) => s.trim());
}

/** Rows of the markdown table that follows `heading` (the header and the rule are skipped). */
function tableAfter(text: string, heading: RegExp, what: string): string[][] {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => heading.test(l));
  if (start < 0) throw new Error(`Not found in the owner's description: ${what}`);
  const rows: string[][] = [];
  let inTable = false;
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('|')) {
      inTable = true;
      const cells = line
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());
      if (cells.every((c) => /^-+$/.test(c))) continue;
      rows.push(cells);
    } else if (inTable) break;
  }
  return rows.slice(1);
}

const MESSAGE_KEYS: Record<string, string> = {
  'A ward is completed': 'wardDone',
  'Both wards completed in one day': 'bothDone',
  'End of a week that reached the target': 'weekReached',
  'End of a week below the target': 'weekBelow',
  'A step is extended': 'extended',
  'Moving to a new step': 'newStep',
  'After a step back or break': 'afterStepBack',
  'Finishing step 24': 'finished',
};

export function extractOwnerTexts(prompt: string, edits: OwnerEdits = {}) {
  const [featureName] = find(
    prompt,
    /The feature name in the interface is \*\*"([^"]+)"\*\*/,
    'feature name',
  );
  // The description's «أكمل باقي أذكار الصباح/المساء» is not used: the owner removed it
  // (2026-10-24, docs/decisions.md). The ward is the whole day's reading.
  const [fromMemory] = find(prompt, /\*\*"([^"]+)":\*\* a button to mark/, 'from memory');
  const [readyQuestion, addNext, keepWeek] = find(
    prompt,
    /\*\*asks\*\*: "([^"]+)", with the buttons "([^"]+)" and "([^"]+)"/,
    'the move-on question',
  );
  const [lifeChange] = find(prompt, /^## 7\. "([^"]+)"/m, 'step back');
  const [todayWard] = find(prompt, /a new top card, \*\*"([^"]+)"\*\*/, 'home card');
  const [stepOf] = find(prompt, /^- "([^"]*X[^"]*24[^"]*)"\.?$/m, 'step X of 24');
  const [progressTitle] = find(prompt, /\*\*Progress screen\*\* \("([^"]+)"\)/, 'progress screen');
  const [editPlan] = find(prompt, /Buttons: "[^"]+", "[^"]+", and "([^"]+)"/, 'edit the plan');
  const [resetPlan] = find(prompt, /a duration picker, and "([^"]+)"/, 'reset the plan');
  const [morningReminder] = find(prompt, /for example "([^"]+)"/, 'reminder text');

  const messages: Record<string, string> = {};
  for (const [when, draft] of tableAfter(prompt, /^## 9\./, 'messages')) {
    const key = MESSAGE_KEYS[when!];
    if (!key) throw new Error(`Unknown message moment: ${when}`);
    messages[key] = draft!;
  }
  const tips: Record<string, string> = {};
  for (const [stage, draft] of tableAfter(prompt, /^\*\*Habit tips\*\*/, 'tips'))
    tips[stage!] = draft!;

  const field = (label: string) => find(prompt, new RegExp(`^- ${label}: (.+)$`, 'm'), label)[0]!;

  return {
    featureName,
    labels: {
      todayWard,
      // "الخطوة X من 24" → a template: the step and the number of steps.
      stepOf: stepOf!.replace('X', '{{step}}').replace('24', '{{total}}'),
      progressTitle,
      fromMemory,
      lifeChange,
      readyQuestion,
      addNext,
      keepWeek,
      editPlan,
      resetPlan,
      morningReminder,
    },
    messages,
    tips,
    // The light-plan hadith. Owner: their own text (2026-10-25; a shadda on the word Allah,
    // 2026-10-29) and no source line on screen (2026-10-29). Their source line and Dorar's data
    // (from the description; checked on 2026-10-24 against dorar.net/hadith/sharh/113728) stay
    // stored.
    hadith: {
      text: edits.hadithCard?.text ?? field('Text'),
      showSource: edits.hadithCard?.showSource ?? true,
      source: edits.hadithCard?.source ?? field('التخريج'),
      dorar: dorarData(prompt, field),
    },
    // By dhikr id: a name instead of the first words in the ward previews (owner, 2026-10-30).
    wardNames: Object.fromEntries(
      (edits.wardNames?.names ?? []).flatMap(({ ids, name }) =>
        ids.map((id) => [String(id), name]),
      ),
    ),
  };
}

/** The hadith's data as the owner gave it from Dorar in the description. */
function dorarData(prompt: string, field: (label: string) => string) {
  const [narrator, scholar, book, number, grading] = find(
    prompt,
    /^- (.+?) \| (.+?) \| (.+?) \| (.+?) \| (.+)$/m,
    'hadith data',
  );
  return {
    text: field('Text'),
    narrator,
    scholar,
    book,
    number,
    grading,
    takhreej: field('التخريج'),
    url: field('Link'),
  };
}

/** The design's texts by placeholder name (`ph('name','text')` and `['name','text']`). */
export function extractDesignTexts(design: string) {
  const at = (re: RegExp, what: string) => find(design, re, what, "the owner's design");
  const [welcome] = at(/ph\('welcome_message','([^']+)'/, 'welcome_message');
  const [maintenanceTip] = at(/\['maintenance_tip','([^']+)'\]/, 'maintenance_tip');
  // The ward words of «افتح ورد الصباح / المساء».
  const [morningWord, eveningWord] = at(/s==='morning'\?'([^']+)':'([^']+)'/, 'ward names');
  // The design's copies of texts that are the owner's (checked against the description).
  const [stageTip2] = at(/ph\('stage_tip_message','([^']+)'/, 'stage_tip_message');
  const [dayDone] = at(/ph\('day_done_message','([^']+)'/, 'day_done_message');
  const stageTips: Record<string, string> = {};
  for (const m of design.matchAll(/\['stage_(\d)_tip','([^']+)'\]/g)) stageTips[m[1]!] = m[2]!;
  return {
    welcome: welcome!,
    maintenanceTip: maintenanceTip!,
    morningWord: morningWord!,
    eveningWord: eveningWord!,
    copies: { stageTip2: stageTip2!, dayDone: dayDone!, stageTips },
  };
}

const same = (a: string, b: string) => a.normalize('NFC') === b.normalize('NFC');

/**
 * Every message and tip, with the moment and the state it is shown in. The
 * welcome is the design's (its sentences: a greeting, the start, which ward
 * to begin with); a later start gets Claude's middle sentence instead.
 */
export function extractTextRows(
  prompt: string,
  design: string,
  drafts: ClaudeDrafts,
): AdwamuhaTextRow[] {
  const owner = extractOwnerTexts(prompt);
  const d = extractDesignTexts(design);
  // The design repeats some of the owner's texts: they must be the same words.
  const copies: [string, string, string | undefined][] = [
    ['stage_tip_message', owner.tips['2']!, d.copies.stageTip2],
    ['day_done_message', owner.messages.bothDone!, d.copies.dayDone],
    ...Object.entries(d.copies.stageTips).map(
      ([n, text]) => [`stage_${n}_tip`, owner.tips[n]!, text] as [string, string, string],
    ),
  ];
  for (const [name, ownerText, designText] of copies) {
    if (!designText || !same(ownerText, designText)) {
      throw new Error(`The design's ${name} differs from the owner's description: ask the owner`);
    }
  }

  const sentences = d.welcome.split(/(?<=\.) /);
  if (sentences.length !== 3 || !sentences[2]!.includes(d.eveningWord)) {
    throw new Error(`The design's welcome_message changed shape: ${d.welcome}`);
  }
  const [greeting, firstStart, beginWith] = sentences as [string, string, string];
  const beginIn = (session: 'morning' | 'evening') =>
    session === 'evening' ? beginWith : beginWith.replace(d.eveningWord, d.morningWord);

  const rows: AdwamuhaTextRow[] = [
    ...Object.entries(owner.messages).map(([moment, text]) => ({
      id: `owner:${moment}`,
      moment,
      state: '',
      text,
      author: 'owner' as const,
    })),
    ...Object.entries(owner.tips).map(([stage, text]) => ({
      id: `owner:tip:${stage}`,
      moment: 'tip',
      state: `stage:${stage}`,
      text,
      author: 'owner' as const,
    })),
    {
      id: 'design:tip:maintenance',
      moment: 'tip',
      state: 'maintenance',
      text: d.maintenanceTip,
      author: 'design',
    },
  ];
  for (const start of ['first', 'later'] as const) {
    for (const session of ['morning', 'evening'] as const) {
      const middle = start === 'first' ? firstStart : drafts.welcomeLater;
      rows.push({
        id: `${start === 'first' ? 'design' : 'claude'}:welcome:${start}:${session}`,
        moment: 'welcome',
        state: `${start}:${session}`,
        text: [greeting, middle, beginIn(session)].join(' '),
        author: start === 'first' ? 'design' : 'claude',
      });
    }
  }
  return rows;
}

export function renderOwnerTexts(prompt: string, edits: OwnerEdits = {}): string {
  // The messages and tips live in the content database (content-source/adwamuha-texts.json).
  const { messages: _messages, tips: _tips, ...texts } = extractOwnerTexts(prompt, edits);
  return [
    '/**',
    ' * GENERATED by scripts/adwamuha/owner-texts.ts from docs/adwamuha/feature-prompt.md and',
    " * the owner's later edits (docs/adwamuha/owner-edits.json).",
    ' * Do not edit: change those, then run the script.',
    ' *',
    " * Owner-authored labels and the hadith. The hadith's text is the owner's; it shows without",
    " * a source line, and Dorar's data stays stored (owner, 2026-10-29). The owner's messages",
    ' * and tips are in the content database (table AdwamuhaTexts).',
    ' */',
    `export const OWNER_TEXTS = ${JSON.stringify(texts, null, 2)} as const;`,
    '',
  ].join('\n');
}

export function renderTextRows(prompt: string, design: string, drafts: ClaudeDrafts): string {
  const file = {
    note:
      "GENERATED by scripts/adwamuha/owner-texts.ts from the owner's description, the owner's " +
      'design and docs/adwamuha/claude-drafts.json. Do not edit: change those, then run the script.',
    texts: extractTextRows(prompt, design, drafts),
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

if (process.argv[1]?.endsWith('owner-texts.ts')) {
  const root = join(dirname(process.argv[1]), '..', '..');
  const read = (file: string) => readFileSync(join(root, file), 'utf8');
  const editsPath = join(root, EDITS_FILE);
  const edits = existsSync(editsPath) ? (JSON.parse(read(EDITS_FILE)) as OwnerEdits) : {};
  const prompt = read(PROMPT_FILE);
  const outputs: [string, string][] = [
    [MODULE_FILE, renderOwnerTexts(prompt, edits)],
    [
      TEXTS_FILE,
      renderTextRows(prompt, read(DESIGN_FILE), JSON.parse(read(DRAFTS_FILE)) as ClaudeDrafts),
    ],
  ];
  for (const [file, out] of outputs) {
    if (process.argv.includes('--check')) {
      if (read(file) !== out) {
        console.error(`${file} is out of date: run scripts/adwamuha/owner-texts.ts`);
        process.exit(1);
      }
    } else {
      writeFileSync(join(root, file), out);
      console.log(`Wrote ${file}`);
    }
  }
}
