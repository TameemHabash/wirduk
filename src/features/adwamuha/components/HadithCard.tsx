import { StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { GoldCard } from '@/components/ui/GoldCard';
import { DISPLAY_FONT } from '@/theme/fonts';

import { OWNER_TEXTS } from '@/features/adwamuha/generated/owner-texts';

/**
 * The hadith of «أدومها», featured (design `.hcard`): a soft gold card with the faint
 * pattern, no source line (owner, 2026-10-29) and no ornament anywhere (owner, 2026-11-26).
 * `big`: setup 1. With big system fonts it wraps.
 */
export function HadithCard({ big = false }: { big?: boolean }) {
  return (
    <GoldCard period="hadith" style={styles.card}>
      <AppText style={[styles.text, big && styles.big, { fontFamily: DISPLAY_FONT }]}>
        {OWNER_TEXTS.hadith.text}
      </AppText>
    </GoldCard>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, paddingVertical: 18, paddingHorizontal: 16, gap: 4 },
  text: { fontSize: 22, lineHeight: 40, textAlign: 'center', alignSelf: 'stretch' },
  big: { fontSize: 28, lineHeight: 52 },
});
