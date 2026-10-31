import { useContext, useMemo } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { AppText } from '@/components/AppText';

import { ReaderActionsContext } from './reader-actions';

/**
 * "Open on Dorar" under a dhikr's source. The reader counts taps anywhere on
 * the page, so a tap here is often a counting tap: in the reader it counts and
 * shows a toast that opens Dorar (owner decision 2026-10-22). A screen-reader
 * user's "activate" is deliberate: it opens Dorar at once.
 */
export function DorarLink({ url }: { url: string }) {
  const { t } = useTranslation();
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
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'activate') open();
        }}
        hitSlop={8}
        style={styles.link}
      >
        <AppText variant="caption" tone="primary">
          {t('reader.openOnDorar')}
        </AppText>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'flex-start' },
});
