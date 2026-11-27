import type { ColorTokens } from './colors';

/** The soft colored boxes of the design: icon tiles, dialog and toast icons, badges. */
export type Tone = 'primary' | 'gold' | 'plain' | 'sand' | 'danger';

/** A tone's soft background and the color of the icon (or text) on it. */
export function toneColors(colors: ColorTokens, tone: Tone): { background: string; icon: string } {
  switch (tone) {
    case 'primary':
      return { background: colors.primarySoft, icon: colors.primaryInk };
    case 'gold':
      return { background: colors.accentSoft, icon: colors.accentInk };
    case 'plain':
      return { background: colors.surfaceMuted, icon: colors.textMuted };
    case 'sand':
      return { background: colors.surface, icon: colors.customAccent };
    case 'danger':
      return { background: colors.dangerSoft, icon: colors.danger };
  }
}
