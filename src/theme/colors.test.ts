import { COLORS } from './colors';

/** WCAG 2.x contrast ratio. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const c = hex
      .replace('#', '')
      .match(/../g)!
      .map((h) => parseInt(h, 16) / 255);
    const l = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * l[0]! + 0.7152 * l[1]! + 0.0722 * l[2]!;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

const AA = 4.5;

describe.each(['light', 'dark'] as const)('%s colors', (scheme) => {
  const c = COLORS[scheme];

  it('keeps all text readable on the main surfaces (WCAG AA)', () => {
    for (const bg of [c.background, c.surface]) {
      expect(contrast(c.text, bg)).toBeGreaterThanOrEqual(7);
      expect(contrast(c.textMuted, bg)).toBeGreaterThanOrEqual(AA);
    }
    expect(contrast(c.primary, c.surface)).toBeGreaterThanOrEqual(AA);
    expect(contrast(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(AA);
  });

  it('keeps faint text (fadl, source) readable on the reading card', () => {
    expect(contrast(c.textFaint, c.surface)).toBeGreaterThanOrEqual(AA);
  });

  it('keeps text readable on the custom (sand) surface', () => {
    expect(contrast(c.text, c.customSurface)).toBeGreaterThanOrEqual(7);
    expect(contrast(c.textMuted, c.customSurface)).toBeGreaterThanOrEqual(AA);
    expect(contrast(c.customAccent, c.customSurface)).toBeGreaterThanOrEqual(AA);
  });
});
