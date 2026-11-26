import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { DhikrText } from '@/components/DhikrText';
import { Icon } from '@/components/Icon';
import type { AdwamuhaMessage } from '@/data/models';
import { SourceFold } from '@/features/reader/SourceFold';
import { DEFAULT_DHIKR_FONT_ID, UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

const AYAH_END = '۝';
const arabicDigits = (n: number) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]!);

/**
 * One message of Adwamuha's library, exactly as stored: a verse in the Quran
 * font with its surah and verse number (Tanzil's text), or a hadith / athar
 * with Dorar's data and a link to its Dorar page, folded under «المصدر» as in the
 * reader (owner, 2026-11-26; here a tap only opens it, nothing counts).
 */
export function LibraryMessageView({
  message,
  size = 22,
}: {
  message: AdwamuhaMessage;
  size?: number;
}) {
  const { t } = useTranslation();
  const { colors, spacing } = useAppTheme();
  const [open, setOpen] = useState(false);
  const { verse, hadith, texts } = message;

  if (verse) {
    // Between verses: the end-of-verse sign with its number; the surah and verses below.
    const body = texts
      .map((text, i) =>
        i < texts.length - 1 ? `${text} ${AYAH_END}${arabicDigits(verse.from + i)}` : text,
      )
      .join(' ');
    const verses = verse.to === verse.from ? String(verse.from) : `${verse.from}–${verse.to}`;
    return (
      <View style={{ gap: spacing.xs }}>
        <DhikrText size={size} fontId={DEFAULT_DHIKR_FONT_ID}>{`﴿${body}﴾`}</DhikrText>
        <AppText variant="caption" tone="muted" style={{ textAlign: 'center' }}>
          {t('adwamuha.verseRef', { sura: verse.suraName, verses })}
        </AppText>
      </View>
    );
  }

  const parts = hadith
    ? [
        hadith.rawi && t('adwamuha.source.rawi', { value: hadith.rawi }),
        t('adwamuha.source.muhaddith', { value: hadith.muhaddith }),
        t('adwamuha.source.book', { value: hadith.book }),
        hadith.number && t('adwamuha.source.number', { value: hadith.number }),
        t('adwamuha.source.grading', { value: hadith.grading }),
      ].filter(Boolean)
    : [];
  return (
    <View style={{ gap: spacing.sm }}>
      <DhikrText size={size - 2}>{texts[0] ?? ''}</DhikrText>
      {parts.length > 0 || hadith?.dorarUrl ? (
        <SourceFold open={open} onToggle={() => setOpen((o) => !o)}>
          {parts.map((part) => (
            <AppText key={part as string} tone="muted" style={styles.line}>
              {part}
            </AppText>
          ))}
          {hadith?.dorarUrl ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => void Linking.openURL(hadith.dorarUrl)}
              hitSlop={8}
              style={styles.link}
            >
              <AppText style={[styles.linkText, { color: colors.primaryInk }]}>
                {t('reader.openOnDorar')}
              </AppText>
              <Icon name="external" size={15} color={colors.primaryInk} />
            </Pressable>
          ) : null}
        </SourceFold>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { fontSize: 12.5, lineHeight: 23, textAlign: 'center', alignSelf: 'stretch' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, minHeight: 32 },
  linkText: { fontFamily: UI_FONTS.medium, fontSize: 13, lineHeight: 20 },
});
