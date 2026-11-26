/** Spacing scale (dp), 4-dp grid. */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/**
 * Corner radius scale (dp), the redesign: small chips and icon tiles (sm), buttons and
 * fields (md), cards and groups (lg), the big card, sheets and dialogs (xl).
 */
export const RADII = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

/** Minimum touch target (dp). */
export const TOUCH_TARGET = 48;
