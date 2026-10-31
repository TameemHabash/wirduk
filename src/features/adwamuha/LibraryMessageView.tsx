import { Linking, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { DhikrText } from '@/components/DhikrText';
import type { AdwamuhaMessage } from '@/data/models';
import { DEFAULT_DHIKR_FONT_ID } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

const AYAH_END = '۝';
const arabicDigits = (n: number) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]!);

/**
 * One message of Adwamuha's library, exactly as stored: a verse in the Quran
 * font with its surah and verse number (Tanzil's text), or a hadith / athar
 * with Dorar's data and a link to its Dorar page.
 */
export function LibraryMessageView({
  message,
  size = 22,
}: {
  message: AdwamuhaMessage;
  size?: number;
}) {
  const { t } = useTranslation();
  const { spacing } = useAppTheme();
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
      {parts.length > 0 ? (
        <AppText variant="caption" tone="muted">
          {parts.join(' | ')}
        </AppText>
      ) : null}
      {hadith?.dorarUrl ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(hadith.dorarUrl)}
          hitSlop={8}
          style={{ alignSelf: 'flex-start' }}
        >
          <AppText variant="label" tone="primary">
            {t('reader.openOnDorar')}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
