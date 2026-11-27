import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { UI_FONTS } from '@/theme/fonts';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { TextButton } from '@/components/ui/TextButton';

/**
 * A screen's own top bar (design `.ab`): back or close at the start, the title in the
 * middle, an action at the end (e.g. «حفظ»). Used by the editors and the reorder screen.
 */
export function AppBar({
  title,
  start = 'back',
  onStart,
  end,
}: {
  title: string;
  start?: 'back' | 'close';
  /** Default: back to the screen before (the unsaved-changes guard still asks). */
  onStart?: () => void;
  end?: ReactNode;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={styles.bar}>
      <IconButton
        icon={start}
        label={t(start === 'back' ? 'common.back' : 'common.close')}
        onPress={onStart ?? (() => router.back())}
      />
      <AppText accessibilityRole="header" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      <View style={styles.end}>{end}</View>
    </View>
  );
}

/** The bar's text action at the end (design: «حفظ», «إنشاء»). */
export function AppBarAction({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return <TextButton title={title} onPress={onPress} disabled={disabled} />;
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 6, gap: 4 },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: UI_FONTS.semibold,
    fontSize: 17,
    lineHeight: 26,
  },
  // As wide as the start button, so the title stays in the middle.
  end: { minWidth: 48, alignItems: 'flex-end' },
});
