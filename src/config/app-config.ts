/**
 * App-wide constants. Change hosting or content version here, not in code.
 *
 * This module has no React Native imports on purpose: the content build
 * script (plain Node) reads it too.
 */

/** Public GitHub Pages site of the `wirduk-audio` repo. */
const HOSTING_BASE_URL = 'https://tameemhabash.github.io/wirduk-audio';

export const APP_CONFIG = {
  hostingBaseUrl: HOSTING_BASE_URL,

  audio: {
    /** A file URL is `${baseUrl}/${lang}/${fileName}.${extension}`. */
    baseUrl: `${HOSTING_BASE_URL}/audio`,
    extension: 'mp3',
    /** How many files "download all" fetches at the same time. */
    maxParallelDownloads: 3,
    /**
     * Show "download every recording" next to "download the morning and evening recordings".
     * Hidden (owner, 2026-10-30): the code stays, only the morning and evening one shows.
     */
    showDownloadAll: false as boolean,
  },

  content: {
    /**
     * Version of the shipped content database (`assets/db/content.db`).
     * Bump it whenever the content changes. The build script writes it into
     * the database, and the app replaces its content copy when it is newer.
     * User data lives in a separate database and is never touched.
     */
    version: 13,
    /** Content ids of the two time-of-day categories shown as cards on Home. */
    morningCategoryId: 1,
    eveningCategoryId: 133,
    /** Dhikr shown as the live preview in reading settings (سبحان الله وبحمده). */
    previewDhikrId: 1017,
  },

  /**
   * Which of morning / evening is "now" (local time, 24h). Morning adhkar are
   * said from dawn until 'asr, evening adhkar after 'asr. Without location
   * (the app asks for none) prayer times are unknown, so fixed hours are used.
   */
  timeOfDay: {
    morningStartHour: 3,
    eveningStartHour: 15,
  },

  privacyPolicyUrl: `${HOSTING_BASE_URL}/privacy/`,

  report: {
    /**
     * The "report an issue" relay (workers/report, live since 2026-10-23).
     * Null hides the "report an issue" row in Settings.
     */
    endpoint: 'https://wirduk-report.wirduk.workers.dev' as string | null,
    /** How long to wait for the relay (screenshots can be slow on a weak network). */
    timeoutMs: 60_000,
  },
} as const;
