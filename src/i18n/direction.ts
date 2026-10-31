import { I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';

import { directionOf, type TextDirection } from './languages';

/**
 * Makes the native layout direction match the app language.
 *
 * The build config already sets the direction of the default language, so on
 * a normal start this does nothing. It matters when the language changes at
 * runtime (future feature): the new direction applies after the app restarts.
 *
 * @returns `true` when the app must restart to apply the new direction.
 */
export function syncLayoutDirection(language: string): boolean {
  const shouldBeRtl = directionOf(language) === 'rtl';
  if (I18nManager.isRTL === shouldBeRtl) return false;
  I18nManager.allowRTL(shouldBeRtl);
  I18nManager.forceRTL(shouldBeRtl);
  return true;
}

/** Direction of the current app language. */
export function useDirection(): { dir: TextDirection; isRtl: boolean } {
  const { i18n } = useTranslation();
  const dir = directionOf(i18n.language);
  return { dir, isRtl: dir === 'rtl' };
}
