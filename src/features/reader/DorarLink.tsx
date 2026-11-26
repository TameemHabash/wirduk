import { useContext, useMemo } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { ReaderActionsContext } from './reader-actions';

/**
 * "Open on Dorar" under a dhikr's source. The reader counts taps anywhere on
 * the page, so a tap here is often a counting tap: in the reader it counts and
 * shows a toast that opens Dorar (owner decision 2026-10-22). A screen-reader
 * user's "activate" is deliberate: it opens Dorar at once.
 */
export function DorarLink({ url }: { url: string }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const reader = useContext(ReaderActionsContext);
  const open = () => void Linking.openURL(url);
  const tap = useMemo(
    () =>
      Gesture.Tap()
        .withTestId('dorar-link')
        .runOnJS(true)
        .onEnd((_e, success) => {
          if (!success) return;
          if (reader) reader.onDorarPress(url);
          else void Linking.openURL(url);
        }),
    [reader, url],
  );
  return (
    <GestureDetector gesture={tap}>
      <View
        accessible
        accessibilityRole="link"
        accessibilityLabel={t('reader.openOnDorar')}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'activate') open();
        }}
        hitSlop={8}
        style={styles.link}
      >
        <AppText style={[styles.text, { color: colors.primaryInk }]}>
          {t('reader.openOnDorar')}
        </AppText>
        <Icon name="external" size={15} color={colors.primaryInk} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, minHeight: 32 },
  text: { fontFamily: UI_FONTS.medium, fontSize: 13, lineHeight: 20 },
});
