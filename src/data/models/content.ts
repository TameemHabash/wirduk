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
  /** How many times to say it. Always >= 1 (for an unlimited one: the number kept for later). */
  count: number;
  /**
   * No end («بلا حد», the user's own adhkar only; owner, 2026-11-27): taps never complete it,
   * only «إتمام» does, and `count` is not shown.
   */
  unlimited: boolean;
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
  /** «بلا حد» (default false); `count` is still kept. */
  unlimited?: boolean;
  fadl?: string | null;
  source?: string | null;
  audioFile?: string | null;
}
