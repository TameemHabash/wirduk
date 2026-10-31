/** Strongly typed models returned by the repositories. */

export interface Category {
  /** Positive for shipped content, negative for the user's own (see custom-ids.ts). */
  id: number;
  title: string;
  /** Position in the default order (content) or in the user's own list (custom), from 1. */
  defaultOrder: number;
  adhkarCount: number;
  /** True for a category the user created. */
  custom: boolean;
}

/** A category as shown on the home screen: custom order + favorite flag applied. */
export interface HomeCategory extends Category {
  isFavorite: boolean;
}

export interface DhikrSource {
  fadl: string | null;
  source: string | null;
  grading: string | null;
  dorarUrl: string | null;
}

export interface Dhikr {
  /** Positive for shipped content, negative for the user's own. */
  id: number;
  categoryId: number;
  /** Position inside its category, from 1. */
  order: number;
  /** How many times to say it. Always >= 1. */
  count: number;
  /** Display text with full tashkeel. */
  text: string;
  /**
   * Audio file name, or null when there is none.
   * Content: a hosted recording (downloaded on demand).
   * Custom: a file in the app's custom-audio folder (recorded or picked).
   */
  audioFile: string | null;
  /**
   * Times the dhikr is said in one play of its recording (1 when there is no
   * recording, and for the user's own). It divides `count` evenly.
   */
  audioRepeats: number;
  /** Fadl and source: from Dorar (content) or the user's own notes (custom). */
  source: DhikrSource | null;
  custom: boolean;
}

export interface DhikrSearchHit {
  dhikrId: number;
  categoryId: number;
  categoryTitle: string;
  order: number;
  text: string;
  custom: boolean;
}

export interface CategorySearchHit {
  categoryId: number;
  title: string;
  custom: boolean;
}

export interface SearchResults {
  categories: CategorySearchHit[];
  adhkar: DhikrSearchHit[];
}

/** A stage of Adwamuha's default plan (owner's names, e.g. «الأساس»). */
export interface PlanStage {
  stage: number;
  title: string;
  /** Minimum weeks per step in this stage. */
  weeks: number;
}

/**
 * One step of Adwamuha's default plan: the dhikr it adds to the morning ward,
 * the evening ward, or both (null: not for that session). Step 0 is the
 * opening, first in every ward (stage null).
 */
export interface PlanStep {
  step: number;
  stage: number | null;
  morningDhikrId: number | null;
  eveningDhikrId: number | null;
}

export interface DefaultPlan {
  stages: PlanStage[];
  steps: PlanStep[];
}

/** The owner's moments for Adwamuha's messages (same list as scripts/adwamuha/messages.ts). */
export const ADWAMUHA_MOMENTS = [
  'wardDone',
  'bothDone',
  'weekReached',
  'weekBelow',
  'extended',
  'newStep',
  'afterStepBack',
  'finished',
] as const;
export type AdwamuhaMoment = (typeof ADWAMUHA_MOMENTS)[number];

/**
 * One approved message of Adwamuha's library: a verse (from the Tanzil text)
 * or a hadith / athar (from Dorar), with the moments it may be shown at.
 */
export interface AdwamuhaMessage {
  id: string;
  kind: 'verse' | 'hadith' | 'athar';
  moments: AdwamuhaMoment[];
  /** Verses: one entry per verse. Hadiths: one entry, Dorar's text. */
  texts: string[];
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

/**
 * One of Adwamuha's own messages or tips (the owner's words, the owner's design's, or
 * Claude's drafts joined with them), shown in one state: '' for a message of its moment,
 * 'stage:N' or 'maintenance' for a tip, '<first|later>:<morning|evening>' for the welcome.
 */
export interface AdwamuhaText {
  id: string;
  moment: AdwamuhaMoment | 'welcome' | 'tip';
  state: string;
  text: string;
}

export interface AudioFileInfo {
  lang: string;
  fileName: string;
  bytes: number;
}

export interface DownloadedAudio extends AudioFileInfo {
  downloadedAt: number;
}

/** What the user enters for one of their own adhkar. */
export interface CustomDhikrInput {
  text: string;
  count: number;
  fadl?: string | null;
  source?: string | null;
  audioFile?: string | null;
}
