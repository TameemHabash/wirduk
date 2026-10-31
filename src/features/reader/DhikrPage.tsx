import { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { DhikrText } from '@/components/DhikrText';
import type { Dhikr } from '@/data/models';
import { useAppTheme } from '@/theme/ThemeProvider';

import { DorarLink } from './DorarLink';

/**
 * One page of the reader. Short adhkar sit in the middle; long ones scroll
 * from the top. Fadl and source (from Dorar, when available) come last,
 * small and faded.
 */
export const DhikrPage = memo(function DhikrPage({ dhikr }: { dhikr: Dhikr }) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useAppTheme();
  const source = dhikr.source;

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { padding: spacing.lg, paddingBottom: spacing.xxl }]}
      showsVerticalScrollIndicator
    >
      <View
        style={{
          backgroundColor: colors.surface,
          // The user's own adhkar: a sand border (the text area stays on `surface`
          // so faint notes keep their contrast).
          borderColor: dhikr.custom ? colors.customBorder : colors.border,
          borderWidth: dhikr.custom ? 2 : 1,
          borderRadius: radii.lg,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.xl,
        }}
      >
        {dhikr.custom && (
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: colors.customSurface,
              borderColor: colors.customBorder,
              borderWidth: 1,
              borderRadius: radii.pill,
              paddingHorizontal: spacing.sm,
              marginBottom: spacing.md,
            }}
          >
            <AppText variant="label" style={{ color: colors.customAccent }}>
              {t('custom.badge')}
            </AppText>
          </View>
        )}
        <DhikrText>{dhikr.text}</DhikrText>

        {source && (
          <View
            style={{
              marginTop: spacing.lg,
              paddingTop: spacing.md,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              borderStyle: 'dashed',
              gap: spacing.xs,
            }}
          >
            {source.fadl && (
              <AppText variant="caption" tone="faint">
                {t('reader.fadl', { text: source.fadl })}
              </AppText>
            )}
            {source.source && (
              <AppText variant="caption" tone="faint">
                {t('reader.source', { text: source.source })}
              </AppText>
            )}
            {source.grading && (
              <AppText variant="caption" tone="faint">
                {t('reader.grading', { text: source.grading })}
              </AppText>
            )}
            {source.dorarUrl && <DorarLink url={source.dorarUrl} />}
          </View>
        )}
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center' },
});
