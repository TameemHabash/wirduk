import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

/**
 * «المصدر» folded under a dhikr (owner, 2026-11-22): a thin line, the word and a small
 * chevron, a thin line, no border. A tap only opens or closes it: it never counts, open or
 * closed (owner, 2026-11-27; its own gesture keeps the reader's tap zone from counting it).
 * What it shows inside (the source lines, the Dorar link) still counts in the reader.
 */
export function SourceFold({
  open,
  onToggle,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const tap = useMemo(
    () =>
      Gesture.Tap()
        .withTestId('source-fold')
        .runOnJS(true)
        .onEnd((_e, success) => {
          if (success) onToggle();
        }),
    [onToggle],
  );
  const line = [styles.line, { backgroundColor: colors.border }];
  return (
    <View style={styles.wrap}>
      <GestureDetector gesture={tap}>
        <View
          accessible
          accessibilityRole="button"
          accessibilityLabel={t('reader.sourceTitle')}
          accessibilityState={{ expanded: open }}
          accessibilityActions={[{ name: 'activate' }]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'activate') onToggle();
          }}
          hitSlop={6}
          style={styles.toggle}
        >
          <View style={line} />
          <AppText tone="faint" style={styles.label}>
            {t('reader.sourceTitle')}
          </AppText>
          <View style={open && styles.flip}>
            <Icon name="down" size={15} color={colors.textFaint} />
          </View>
          <View style={line} />
        </View>
      </GestureDetector>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, alignSelf: 'stretch' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 },
  line: { flex: 1, height: StyleSheet.hairlineWidth * 2 },
  label: { fontFamily: UI_FONTS.medium, fontSize: 13, lineHeight: 20 },
  flip: { transform: [{ rotate: '180deg' }] },
  body: { alignItems: 'center', gap: 2 },
});
