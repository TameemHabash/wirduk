import type { ContentPlan } from './plan.ts';

/** Shape of `content-source/adhkar.json` (rn0x/Adhkar-json). */
export interface SourceDhikr {
  id: number;
  text: string;
  count: number;
  audio: string;
  filename: string;
}

export interface SourceCategory {
  id: number;
  category: string;
  audio: string;
  filename: string;
  array: SourceDhikr[];
}

/** Shape of `content-source/overrides.json`. */
export interface CategorySplitPart {
  id: number;
  titles: Record<string, string>;
  excludeDhikr: number[];
  excludeReason?: string;
  /** Text fixes for this part only (e.g. the evening words), applied before removePatterns. */
  textFixes?: PartTextFix[];
  removePatterns: string[];
  removeReason?: string;
}

/** A text fix inside one split part. `dhikrId` is the SOURCE dhikr id. */
export interface PartTextFix {
  dhikrId: number;
  find: string;
  replace: string;
  reason: string;
  evidence: string;
}

export interface CategorySplit {
  sourceCategoryId: number;
  reason: string;
  parts: CategorySplitPart[];
}

export interface CountFix {
  categoryId: number;
  dhikrId: number;
  from: number;
  to: number;
  reason: string;
}

export interface TextFix {
  target: 'title' | 'text';
  categoryId: number;
  /** Required when target is "text". */
  dhikrId?: number;
  find: string;
  replace: string;
  reason: string;
  /** Where the correct wording comes from (e.g. a dorar.net link). */
  evidence: string;
}

/**
 * A dhikr that is not in the book, added by the owner (their own words).
 * Its id is `makeDhikrId(categoryId, dhikrId)` in each category; use 900+
 * so it never meets a book position.
 */
export interface AddedDhikr {
  dhikrId: number;
  /** Content category ids (after splits), e.g. [1, 133] for morning and evening. */
  categoryIds: number[];
  position: 'first';
  count: number;
  texts: Record<string, string>;
  reason: string;
  evidence: string;
}

export interface Overrides {
  categorySplits: CategorySplit[];
  countFixes: CountFix[];
  textFixes: TextFix[];
  addedAdhkar?: AddedDhikr[];
  /** Drop the book's (( )) quote marks from every dhikr (see quote-marks.ts). */
  removeQuoteMarks?: { reason: string; evidence: string };
  /**
   * Each part of a long dhikr on its own line (see line-breaks.ts).
   * `stepListIds`: content dhikr ids whose " - " join a list of steps.
   */
  lineBreaks?: { reason: string; evidence: string; stepListIds: number[] };
  /**
   * How many times the dhikr is said in one recording, by audio file name
   * (owner's words; a file not listed says it once). The reader plays a
   * recording count ÷ repeats times. Every dhikr that uses a listed file must
   * have a count that this number divides evenly, or the build fails.
   */
  audioRepeats?: { reason: string; files: Record<string, number> };
  /**
   * The owner's own recordings (milestone 11): dhikr id → audio file name, in place of the
   * book's. Written by scripts/content/apply-audio-sheet.ts from the owner's sheet; every
   * file must be in the audio manifest.
   */
  audioRecordings?: { reason: string; sheet: string; adhkar: Record<string, string> };
}

/**
 * Shape of `content-source/audio-manifest.json`. `file` is the published name: without its
 * extension for an mp3 (the book's recordings), with it for any other format (`1001.m4a`).
 */
export interface AudioManifestEntry {
  file: string;
  bytes: number;
  sha256: string;
}

export interface AudioManifest {
  lang: string;
  files: AudioManifestEntry[];
}

/**
 * Shape of `content-source/dorar-sources.json`: what was found on dorar.net
 * (الموسوعة الحديثية), copied exactly. Never written from memory.
 */
export interface DorarHadith {
  /** Link to this hadith on dorar.net. */
  url: string;
  /** The hadith text exactly as Dorar shows it. */
  text: string;
  /** الراوي */
  rawi: string;
  /** المحدث */
  muhaddith: string;
  /** المصدر */
  book: string;
  /** الصفحة أو الرقم */
  number: string;
  /** خلاصة حكم المحدث */
  grading: string;
}

export interface DorarSourceEntry {
  /** Content dhikr ids with this source (the morning and evening copies share one). */
  dhikrIds: number[];
  /**
   * matched: the Dorar hadith contains the dhikr's wording, or the owner chose it; it is shipped.
   * review: no confident match; nothing is shipped, the owner decides.
   * none: the owner decided this dhikr shows no source.
   */
  status: 'matched' | 'review' | 'none';
  /**
   * Why an entry needs the owner:
   * short: a phrase of four words or fewer, found in many hadith;
   * formula: the same words are narrated by several Companions in different hadith;
   * disputed: scholars grade the hadith differently;
   * quran: a Quran recitation (a hadith about reading it does not contain the verses);
   * weakOnly: only weak narrations contain the wording;
   * noMatch: no narration contains the wording closely enough.
   */
  reason?: 'short' | 'formula' | 'disputed' | 'quran' | 'weakOnly' | 'noMatch';
  /** What was searched on Dorar. */
  query: string;
  /** How it was matched, or what was found and why it needs review. */
  note: string;
  hadith?: DorarHadith;
  /** For short phrases and formulas: different hadith with these words, for the owner to pick from. */
  options?: DorarHadith[];
  /** Another scholar's verdict that the hadith is weak. Shown to the owner only, never shipped. */
  otherGrading?: { grading: string; muhaddith: string; book: string; number: string; url: string };
  /**
   * An exact quote from `hadith.text`, shipped only after the owner approves it.
   * With `by: 'owner'` the owner wrote it in their own words (not a quote); it
   * must still sit on a shipped Dorar source.
   */
  fadl?: { text: string; approved: boolean; by?: 'owner' };
}

/**
 * A wording change from Dorar (e.g. the evening wording of a morning dhikr).
 * Shown to the owner; once approved, the build puts the Dorar words in place
 * of the current ones.
 */
export interface WordingProposal {
  dhikrId: number;
  /** The words in the source text. */
  current: string;
  /** The words as in the Dorar hadith. */
  proposed: string;
  note: string;
  hadith: DorarHadith;
  approved?: boolean;
}

export interface DorarSources {
  lang: string;
  /** When the searches were done (YYYY-MM-DD). */
  retrievedOn: string;
  entries: DorarSourceEntry[];
  wordingProposals?: WordingProposal[];
  /** Short notes for the owner (shown at the top of docs/sources-review.md). */
  ownerNotes?: string[];
}

/** One row of DhikrSources, ready to be written. */
export interface ContentSource {
  dhikrId: number;
  lang: string;
  fadl: string | null;
  source: string;
  grading: string | null;
  dorarUrl: string;
}

/** The transformed content, ready to be written to SQLite. */
export interface ContentCategory {
  id: number;
  sortOrder: number;
  audioFile: string | null;
  titles: Record<string, string>;
}

export interface ContentDhikr {
  id: number;
  categoryId: number;
  sortOrder: number;
  count: number;
  audioFile: string | null;
  texts: Record<string, string>;
}

export interface ContentAudioFile {
  lang: string;
  fileName: string;
  bytes: number;
  /** Times the dhikr is said in this recording (1 unless `audioRepeats` says more). */
  repeats: number;
}

export interface ChangeLogEntry {
  kind:
    | 'split'
    | 'exclude'
    | 'remove-notes'
    | 'count'
    | 'text'
    | 'wording'
    | 'added'
    | 'quote-marks'
    | 'line-breaks'
    | 'audio-repeats'
    | 'audio-recordings'
    | 'title'
    | 'cleanup';
  where: string;
  detail: string;
}

/** One approved message of Adwamuha's library (scripts/adwamuha/messages.ts). */
export interface ContentMessage {
  lang: string;
  id: string;
  kind: 'verse' | 'hadith' | 'athar';
  moments: string[];
  /** Verses: one per line. */
  text: string;
  verse: { sura: number; suraName: string; from: number; to: number } | null;
  hadith: {
    rawi: string;
    muhaddith: string;
    book: string;
    number: string;
    grading: string;
    dorarUrl: string;
  } | null;
}

/** One of Adwamuha's own messages or tips (scripts/adwamuha/owner-texts.ts). */
export interface ContentText {
  lang: string;
  id: string;
  moment: string;
  state: string;
  text: string;
  author: 'owner' | 'design' | 'claude';
}

export interface ContentModel {
  categories: ContentCategory[];
  adhkar: ContentDhikr[];
  audioFiles: ContentAudioFile[];
  changes: ChangeLogEntry[];
  /** Fadl and source per dhikr, from dorar-sources.json (matched entries only). */
  sources: ContentSource[];
  /** Adwamuha's default plan (checked by plan.ts), when the plan file exists. */
  plan?: ContentPlan;
  /** Adwamuha's approved messages, when the library file exists. */
  messages?: ContentMessage[];
  /** Adwamuha's own messages and tips, when the texts file exists. */
  texts?: ContentText[];
}
