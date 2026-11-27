/**
 * Test-only: named ids in the shipped content (`assets/db/content.db`), so a test
 * says what it uses instead of a bare number. `content.test.ts` checks each one
 * against the database (a content change that moves them fails there first).
 */
export const CATEGORY = {
  /** «أذكار الصباح»: 24 adhkar, the owner's opening first. */
  morning: 1,
  /** «أذكار المساء»: 22 adhkar, the evening words. */
  evening: 133,
  /** The first chapter in the adhkar tab: 13 adhkar. */
  firstListed: 2,
  /** A chapter of one dhikr said once: one tap finishes it. */
  oneDhikr: 4,
} as const;

export const DHIKR = {
  /** The owner's opening dhikr of the morning: count 1, no source. */
  morningOpening: 1901,
  /** The same opening in the evening. */
  eveningOpening: 133901,
  /** Ayat al-Kursi, the book's first in the morning: count 1, the owner's recording. */
  ayatAlKursi: 1001,
  /** The three Quls: a long text, count 3, with a fadl and a Dorar source. */
  threeQuls: 1002,
  /** «رضيت بالله ربًّا»: count 3, with a source. */
  raditu: 1013,
  /** «سبحان الله وبحمده»: count 100; its recording says it 5 times. */
  hundredTimes: 1017,
  /** Ayat al-Kursi in the evening. */
  eveningAyatAlKursi: 133001,
} as const;
