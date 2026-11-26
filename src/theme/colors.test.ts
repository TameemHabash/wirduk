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
      expect(contrast(c.primaryInk, bg)).toBeGreaterThanOrEqual(AA);
      expect(contrast(c.accentInk, bg)).toBeGreaterThanOrEqual(AA);
    }
    expect(contrast(c.textMuted, c.surfaceMuted)).toBeGreaterThanOrEqual(AA);
    expect(contrast(c.primary, c.surface)).toBeGreaterThanOrEqual(AA);
    expect(contrast(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(AA);
  });

  it('keeps faint text (fadl, source) readable on the reading page', () => {
    expect(contrast(c.textFaint, c.surface)).toBeGreaterThanOrEqual(AA);
    expect(contrast(c.textFaint, c.background)).toBeGreaterThanOrEqual(AA);
  });

  it('keeps text readable on the soft fills (tiles, badges, soft buttons)', () => {
    expect(contrast(c.primaryInk, c.primarySoft)).toBeGreaterThanOrEqual(AA);
    expect(contrast(c.accentInk, c.accentSoft)).toBeGreaterThanOrEqual(AA);
    expect(contrast(c.text, c.accentSoft)).toBeGreaterThanOrEqual(7);
  });

  it('keeps the dialog and toast readable (danger, toast)', () => {
    expect(contrast(c.text, c.toast)).toBeGreaterThanOrEqual(7);
    expect(contrast(c.textMuted, c.toast)).toBeGreaterThanOrEqual(AA);
    expect(contrast(c.onDanger, c.danger)).toBeGreaterThanOrEqual(AA);
    expect(contrast(c.danger, c.dangerSoft)).toBeGreaterThanOrEqual(AA);
    expect(contrast(c.danger, c.surface)).toBeGreaterThanOrEqual(AA);
  });

  it.each(['morning', 'evening'] as const)(
    'keeps text readable on both ends of the golden %s card',
    (period) => {
      for (const bg of [c[`${period}From`], c[`${period}To`]]) {
        expect(contrast(c.text, bg)).toBeGreaterThanOrEqual(7);
        expect(contrast(c.textMuted, bg)).toBeGreaterThanOrEqual(AA);
        expect(contrast(c.primaryInk, bg)).toBeGreaterThanOrEqual(AA);
        // Gold on the card: its icon and the large hadith line (3:1 for large text and icons).
        expect(contrast(c.accentInk, bg)).toBeGreaterThanOrEqual(3);
      }
      expect(contrast(c.accentInk, c[`${period}To`])).toBeGreaterThanOrEqual(AA);
    },
  );

  it('keeps text readable on the custom (sand) surface', () => {
    expect(contrast(c.text, c.customSurface)).toBeGreaterThanOrEqual(7);
    expect(contrast(c.textMuted, c.customSurface)).toBeGreaterThanOrEqual(AA);
    expect(contrast(c.customAccent, c.customSurface)).toBeGreaterThanOrEqual(AA);
  });
});
