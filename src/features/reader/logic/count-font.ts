/** The count's size in the reader's ring (40 up to 999, as the design). */
export const COUNT_FONT_SIZE = 40;

/**
 * The count's font size: 40 up to 3 digits, then smaller, so a long number (an unlimited
 * dhikr, or the user's own with a big count) stays inside the ring (about 72 points wide
 * where the number sits; a digit is about 0.6 of the size).
 */
export function countFontSize(count: number): number {
  const digits = String(Math.max(0, Math.trunc(count))).length;
  return digits <= 3 ? COUNT_FONT_SIZE : Math.floor(72 / (0.6 * digits));
}
