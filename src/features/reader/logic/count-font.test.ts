import { COUNT_FONT_SIZE, countFontSize } from './count-font';

describe('the count in the ring', () => {
  it('keeps the design size up to 999', () => {
    expect(countFontSize(0)).toBe(COUNT_FONT_SIZE);
    expect(countFontSize(999)).toBe(COUNT_FONT_SIZE);
  });

  it('gets smaller for a longer number (an unlimited dhikr), so it stays inside the ring', () => {
    expect(countFontSize(1000)).toBe(30);
    expect(countFontSize(12_345)).toBe(24);
    expect(countFontSize(100_000)).toBe(20);
    // Every size keeps the number about 72 points wide or less.
    for (const n of [1000, 99_999, 100_000, 1_234_567]) {
      expect(countFontSize(n) * 0.6 * String(n).length).toBeLessThanOrEqual(72);
    }
  });
});
