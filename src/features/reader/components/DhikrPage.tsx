import { memo, useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { BottomFade } from './BottomFade';
import { DhikrText } from '@/components/ui/DhikrText';
import { Icon } from '@/components/ui/Icon';
import type { Dhikr } from '@/data/models/index';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { DorarLink } from './DorarLink';
import { SourceFold } from './SourceFold';

/**
 * One page of the reader (redesign): the text on the page, no card behind it. Short adhkar
 * sit in the middle; a long one starts at the top and scrolls, and its bottom edge fades
 * only while more text is below. Then the fadl (a small gold star, quiet text, no label:
 * option «ب») and «المصدر» folded. `current`: the page on screen; the source folds again
 * when the page changes.
 */
export const DhikrPage = memo(function DhikrPage({
  dhikr,
  current = true,
}: {
  dhikr: Dhikr;
  current?: boolean;
}) {
  const { t } = useTranslation();
  const { colors, spacing } = useAppTheme();
  const source = dhikr.source;
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  // Folded again once another page is shown (owner, 2026-11-22).
  const [wasCurrent, setWasCurrent] = useState(current);
  if (current !== wasCurrent) {
    setWasCurrent(current);
    if (!current) setOpen(false);
  }

  // The fade: only while text is below the bottom edge.
  const [box, setBox] = useState(0);
  const [content, setContent] = useState(0);
  const [offset, setOffset] = useState(0);
  const more = content - offset - box > 2;
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setOffset(e.nativeEvent.contentOffset.y);

  const hasSource = !!source && !!(source.source || source.grading || source.dorarUrl);

  return (
    <View
      testID="dhikr-page"
      style={styles.fill}
      onLayout={(e: LayoutChangeEvent) => setBox(e.nativeEvent.layout.height)}
    >
      <ScrollView
        testID="dhikr-scroll"
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: spacing.lg + 4,
            paddingTop: spacing.sm,
            paddingBottom: spacing.xl,
            gap: 14,
          },
        ]}
        onContentSizeChange={(_w, h) => setContent(h)}
        onScroll={onScroll}
        scrollEventThrottle={32}
        showsVerticalScrollIndicator={false}
      >
        {dhikr.custom && (
          // The user's own dhikr: the «أذكاري» badge, then the sand line (owner, 2026-11-25).
          <View style={styles.mine}>
            <View
              style={[
                styles.badge,
                { backgroundColor: colors.customSurface, borderColor: colors.customBorder },
              ]}
            >
              <AppText variant="label" style={{ color: colors.customAccent }}>
                {t('custom.badge')}
              </AppText>
            </View>
            <View style={[styles.mineLine, { backgroundColor: colors.customBorder }]} />
          </View>
        )}
        <DhikrText>{dhikr.text}</DhikrText>

        {source?.fadl ? (
          <View
            style={styles.fadl}
            accessible
            accessibilityLabel={t('reader.fadl', { text: source.fadl })}
          >
            <View style={styles.star}>
              <Icon name="khatam" size={13} color={colors.accent} strokeWidth={1.6} />
            </View>
            <AppText tone="muted" style={styles.fadlText}>
              {source.fadl}
            </AppText>
          </View>
        ) : null}

        {source && hasSource ? (
          <SourceFold open={open} onToggle={toggle}>
            {source.source ? (
              <AppText tone="muted" style={styles.sourceLine}>
                {t('reader.source', { text: source.source })}
              </AppText>
            ) : null}
            {source.grading ? (
              <AppText tone="muted" style={styles.sourceLine}>
                {t('reader.grading', { text: source.grading })}
              </AppText>
            ) : null}
            {source.dorarUrl ? <DorarLink url={source.dorarUrl} /> : null}
          </SourceFold>
        ) : null}
      </ScrollView>
      {more ? <BottomFade color={colors.background} /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // Short adhkar in the middle; a long one from the top (it scrolls).
  content: { flexGrow: 1, justifyContent: 'center' },
  mine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 1 },
  mineLine: { flex: 1, height: 2, borderRadius: 1 },
  fadl: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 8 },
  star: { marginTop: 6 },
  fadlText: { flexShrink: 1, fontSize: 14, lineHeight: 25, textAlign: 'center' },
  sourceLine: {
    fontFamily: UI_FONTS.regular,
    fontSize: 12.5,
    lineHeight: 23,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
});
