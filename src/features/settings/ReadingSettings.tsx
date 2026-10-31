import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { DhikrText } from '@/components/DhikrText';
import { Icon } from '@/components/Icon';
import { APP_CONFIG } from '@/config/app-config';
import { useRepositories } from '@/data/DataProvider';
import { DHIKR_FONT_SIZE, stepFontSize } from '@/data/settings/settings';
import { useSettings } from '@/data/settings/SettingsProvider';
import { DHIKR_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TOUCH_TARGET } from '@/theme/tokens';

import { RowDivider, SettingsGroup } from './SettingsParts';

/** A real dhikr for the live preview. */
function usePreviewText(): string | null {
  const { content } = useRepositories();
  const { i18n } = useTranslation();
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    content
      .getDhikr(APP_CONFIG.content.previewDhikrId, i18n.language)
      .then((d) => !cancelled && setText(d?.text ?? null))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [content, i18n.language]);
  return text;
}

/** Text size (with live preview) and dhikr font. */
export function ReadingSettings() {
  const { t } = useTranslation();
  const { settings, update } = useSettings();
  const { colors, radii, spacing } = useAppTheme();
  const preview = usePreviewText();
  const size = settings.dhikrFontSize;

  const stepButton = (direction: 1 | -1) => {
    const disabled = direction > 0 ? size >= DHIKR_FONT_SIZE.max : size <= DHIKR_FONT_SIZE.min;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(direction > 0 ? 'settings.increase' : 'settings.decrease')}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => void update('dhikrFontSize', stepFontSize(size, direction))}
        style={[
          styles.step,
          { borderRadius: radii.sm, backgroundColor: colors.surfaceMuted },
          disabled && { opacity: 0.4 },
        ]}
      >
        <AppText variant="bodyStrong" style={{ fontSize: direction > 0 ? 18 : 13 }}>
          {t(direction > 0 ? 'settings.increaseShort' : 'settings.decreaseShort')}
        </AppText>
      </Pressable>
    );
  };

  return (
    <SettingsGroup title={t('settings.reading')}>
      <View style={{ padding: spacing.md, gap: spacing.sm }}>
        <View style={styles.sizeHeader}>
          <AppText>{t('settings.textSize')}</AppText>
          <AppText variant="caption" tone="muted">
            {String(size)}
          </AppText>
        </View>
        <View style={[styles.sizeRow, { gap: spacing.sm }]}>
          {stepButton(1)}
          <View style={styles.preview}>{preview ? <DhikrText>{preview}</DhikrText> : null}</View>
          {stepButton(-1)}
        </View>
      </View>

      <RowDivider />

      <View style={{ paddingTop: spacing.md }}>
        <AppText style={{ paddingHorizontal: spacing.md }}>{t('settings.font')}</AppText>
        <View accessibilityRole="radiogroup" style={{ paddingVertical: spacing.xs }}>
          {DHIKR_FONTS.map((font) => {
            const selected = font.id === settings.dhikrFont;
            return (
              <Pressable
                key={font.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={t(font.nameKey)}
                onPress={() => void update('dhikrFont', font.id)}
                style={({ pressed }) => [
                  styles.fontRow,
                  { paddingHorizontal: spacing.md, gap: spacing.md },
                  pressed && { backgroundColor: colors.surfaceMuted },
                ]}
              >
                <View
                  style={[styles.radio, { borderColor: selected ? colors.primary : colors.border }]}
                >
                  {selected ? (
                    <Icon name="check" size={14} color={colors.primary} strokeWidth={3} />
                  ) : null}
                </View>
                <AppText
                  variant="caption"
                  tone={selected ? 'primary' : 'muted'}
                  style={styles.fontName}
                >
                  {t(font.nameKey)}
                </AppText>
                {preview ? (
                  <View style={styles.fontSample}>
                    <DhikrText
                      fontId={font.id}
                      size={18}
                      numberOfLines={1}
                      style={styles.sampleText}
                    >
                      {preview}
                    </DhikrText>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </SettingsGroup>
  );
}

const styles = StyleSheet.create({
  sizeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sizeRow: { flexDirection: 'row', alignItems: 'center' },
  step: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: { flex: 1, minHeight: 64, justifyContent: 'center' },
  fontRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontName: { width: 72 },
  fontSample: { flex: 1, overflow: 'hidden' },
  sampleText: { textAlign: 'auto' },
});
