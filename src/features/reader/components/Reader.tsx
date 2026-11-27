import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import PagerView from 'react-native-pager-view';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { useToast } from '@/components/ui/Toast';
import type { Category, Dhikr } from '@/data/models';
import { useSettings } from '@/data/settings/SettingsProvider';
import { useAdwamuhaActionsOptional } from '@/features/adwamuha/state/AdwamuhaProvider';
import { PlayButton } from '@/features/audio/components/PlayButton';
import { type DhikrAudio, useDhikrAudio } from '@/features/audio/hooks/useDhikrAudio';
import { useAdvanceTimer } from '@/features/reader/hooks/useAdvanceTimer';
import { useKeepScreenOn } from '@/features/reader/hooks/useKeepScreenOn';
import { usePagerRebuild } from '@/features/reader/hooks/usePagerRebuild';
import { useSaveReaderSession } from '@/features/reader/hooks/useSaveReaderSession';
import { afterComplete, initialIndex } from '@/features/reader/logic/navigation';
import { counterStore } from '@/features/reader/state/counter-store';
import { ReaderActionsContext } from '@/features/reader/state/reader-actions';
import { useTickSound } from '@/hooks/useTickSound';
import { useDirection } from '@/i18n/direction';
import { haptics } from '@/lib/haptics';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TOUCH_TARGET } from '@/theme/tokens';

import { CompleteButton } from './CompleteButton';
import { DhikrPage } from './DhikrPage';
import { ProgressSegments } from './ProgressSegments';
import { ReaderCounter } from './ReaderCounter';
import { ReaderHeader } from './ReaderHeader';

/**
 * A short tap counts; a scroll or a swipe never does.
 * `maxDistance` fails the tap as soon as the finger moves (scrolling the text
 * or swiping the pager), and `maxDuration` ignores long presses.
 */
const TAP_MAX_DISTANCE = 10;
const TAP_MAX_DURATION_MS = 350;
/**
 * Pages drawn on each side of the current one (RF5: a long category drew every page at
 * once). Three: when the reader moves several pages, the pager scrolls through the last
 * three before the target. A page once drawn stays (its scroll position too).
 */
const PAGES_AROUND = 3;

/** The pages drawn so far: a range that grows to cover the current page and its neighbours. */
function useDrawnPages(index: number, count: number) {
  const around = (i: number) => ({
    from: Math.max(0, i - PAGES_AROUND),
    to: Math.min(count - 1, i + PAGES_AROUND),
  });
  const [range, setRange] = useState(() => around(index));
  const need = around(index);
  if (need.from < range.from || need.to > range.to) {
    // Adjusted while drawing (React's pattern for state that follows a prop).
    setRange({ from: Math.min(range.from, need.from), to: Math.max(range.to, need.to) });
  }
  return (i: number) => i >= Math.min(range.from, need.from) && i <= Math.max(range.to, need.to);
}
interface ReaderProps {
  /** The header's title (and the edit button for the user's own category). */
  category: Category;
  adhkar: Dhikr[];
  startDhikrId?: number;
  /**
   * When every dhikr is complete. Default: the category's completion screen
   * (and, for the morning / evening category, Adwamuha counts the day).
   */
  onFinished?: () => void;
  /** Adwamuha: this list is the morning / evening ward ("continue where I stopped" reopens it). */
  ward?: 'morning' | 'evening';
  /**
   * Each change of this list's counts (only those above 0, by dhikr id), while
   * the reader is open: the Adwamuha ward keeps them for the day.
   */
  onCountsChange?: (counts: Record<string, number>) => void;
}

export function Reader({
  category,
  adhkar,
  startDhikrId,
  onFinished,
  ward,
  onCountsChange,
}: ReaderProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { isRtl } = useDirection();
  const { settings } = useSettings();
  const { colors, spacing } = useAppTheme();

  const [index, setIndex] = useState(() =>
    initialIndex(
      adhkar.map((d) => d.id),
      startDhikrId,
      (i) => counterStore.isComplete(adhkar[i]!),
    ),
  );
  const indexRef = useRef(index);
  const pagerRef = useRef<PagerView>(null);
  /** Pages the reader moved to itself, whose "page selected" event has not come yet. */
  const pendingPages = useRef<number[]>([]);
  const { after: afterPause, cancel: cancelAdvance } = useAdvanceTimer();

  // The ids are fixed for this instance: a reload on focus gives a new array
  // with the same ids, and a changed list mounts a new Reader (see its key).
  const [ids] = useState(() => adhkar.map((d) => d.id));

  // Every change of the counts goes to `onCountsChange` (the ward keeps them for
  // the day). Declared before the reset below, so on leaving it stops first and
  // the reset is never passed on.
  const countsListener = useRef(onCountsChange);
  useEffect(() => {
    countsListener.current = onCountsChange;
  });
  const passCounts = onCountsChange !== undefined;
  useEffect(() => {
    if (!passCounts) return;
    return counterStore.subscribe(() => {
      const counts: Record<string, number> = {};
      for (const id of ids) {
        const n = counterStore.get(id);
        if (n > 0) counts[String(id)] = n;
      }
      countsListener.current?.(counts);
    });
  }, [ids, passCounts]);

  // Leaving the reader (back, home, or the completion screen) starts this
  // category from zero next time (owner decision 2026-10-17); the ward's counts
  // come back from where they are kept.
  useEffect(() => () => counterStore.resetMany(ids), [ids]);

  const hapticsOn = settings.hapticsEnabled;
  const nextVibration = settings.nextDhikrVibration;
  const tick = useTickSound(settings.tickSound);

  /**
   * Shows page `i`. The index changes here at once: with the screen off the
   * pager's event only arrives when the screen is on again (the audio must not
   * wait for it).
   */
  const moveTo = useCallback((i: number) => {
    if (i === indexRef.current) return;
    pendingPages.current.push(i);
    indexRef.current = i;
    setIndex(i);
    if (AppState.currentState === 'background') pagerRef.current?.setPageWithoutAnimation(i);
    else pagerRef.current?.setPage(i);
  }, []);

  // The link's dhikr picks the start page above. A new link to this screen while it is open
  // (wirduk://category/1?dhikr=1002 with chapter 1 open) only gives it new params: go to that
  // dhikr (owner, 2026-11-27). The param is cleared after use, so the same link works again.
  useEffect(() => {
    if (startDhikrId === undefined) return;
    router.setParams({ dhikr: '' });
    const i = ids.indexOf(startDhikrId);
    if (i >= 0) moveTo(i);
  }, [startDhikrId, ids, moveTo, router]);

  /**
   * After the dhikr at `from` is complete: a short pause, then the next open
   * dhikr or the completion screen. With the screen off it happens at once
   * (JS timers wait until the screen is on). Returns the next dhikr, or null.
   */
  const adwamuha = useAdwamuhaActionsOptional();
  const advanceAfterComplete = useCallback(
    (from: number): Dhikr | null => {
      const next = afterComplete(from, adhkar.length, (i) => counterStore.isComplete(adhkar[i]!));
      const go = () => {
        if (next.type === 'finished') {
          if (onFinished) {
            onFinished();
            return;
          }
          // The whole morning / evening category also counts as the Adwamuha ward (owner).
          void adwamuha?.onCategoryFinished(category.id).catch(() => undefined);
          router.replace({ pathname: '/category/[id]/done', params: { id: String(category.id) } });
        } else {
          moveTo(next.index);
        }
      };
      // The finished category has its own, longer vibration.
      if (next.type === 'goto') haptics.nextDhikr(nextVibration);
      afterPause(go);
      return next.type === 'goto' ? adhkar[next.index]! : null;
    },
    [adhkar, adwamuha, afterPause, category.id, moveTo, nextVibration, onFinished, router],
  );

  /** Set below (the audio needs the callbacks above); read only in event handlers. */
  const audioRef = useRef<DhikrAudio | null>(null);
  /** The user finished the dhikr: move on, and let its recording's listener hear the next one. */
  const finishedByUser = useCallback(
    (dhikr: Dhikr) => {
      const next = advanceAfterComplete(indexRef.current);
      audioRef.current?.continueAfter(dhikr, next);
    },
    [advanceAfterComplete],
  );

  const onTap = useCallback(() => {
    const dhikr = adhkar[indexRef.current];
    if (!dhikr) return;
    const result = counterStore.tap(dhikr.id, dhikr.count);
    if (result.event === 'ignored') return;
    tick();
    if (result.event === 'counted') {
      haptics.count(hapticsOn);
      return;
    }
    finishedByUser(dhikr);
  }, [adhkar, finishedByUser, hapticsOn, tick]);

  const onComplete = useCallback(() => {
    const dhikr = adhkar[indexRef.current];
    if (dhikr && counterStore.complete(dhikr.id, dhikr.count)) finishedByUser(dhikr);
  }, [adhkar, finishedByUser]);

  // "Count with the audio" (setting): each finished play counts the times the
  // recording says the dhikr (usually 1; never above the count), and the
  // recording plays only the times still left. After counting by hand, the
  // last play may say it more often than it still counts (e.g. 2 left, said 4).
  const onPlayed = useCallback(
    (dhikr: Dhikr) => {
      const result = counterStore.tap(dhikr.id, dhikr.count, dhikr.audioRepeats);
      if (result.event !== 'completed') return undefined;
      const i = adhkar.findIndex((d) => d.id === dhikr.id);
      return { next: advanceAfterComplete(i) };
    },
    [adhkar, advanceAfterComplete],
  );
  const playsLeft = useCallback(
    (dhikr: Dhikr) => Math.ceil((dhikr.count - counterStore.get(dhikr.id)) / dhikr.audioRepeats),
    [],
  );
  const audioCounts = settings.audioCounts;
  const audio = useDhikrAudio({
    categoryTitle: category.title,
    adhkar,
    onPlayed: audioCounts ? onPlayed : undefined,
    playsFor: audioCounts ? playsLeft : undefined,
  });
  useEffect(() => {
    audioRef.current = audio;
  });

  useKeepScreenOn(settings.keepScreenOn);
  useSaveReaderSession({
    enabled: settings.restoreSession,
    categoryId: category.id,
    adhkar,
    indexRef,
    ward,
  });

  // A tap on "عرض في الدرر السنية" is often a counting tap that landed there:
  // it counts, and a toast offers to open Dorar.
  const toast = useToast();
  const onDorarPress = useCallback(
    (url: string) => {
      onTap();
      toast.show({
        message: t('reader.dorarToast'),
        icon: 'external',
        onPress: () => void Linking.openURL(url),
      });
    },
    [onTap, t, toast],
  );
  const readerActions = useMemo(() => ({ onDorarPress }), [onDorarPress]);

  // Landscape: the text and the counter side by side.
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  /** The pager is being dragged or is settling (a real page change, not a layout one). */
  const scrolling = useRef(false);
  // A new pager after its width changed: the old pager's events are gone with it.
  const { pagerKey, onPagerLayout } = usePagerRebuild(() => {
    pendingPages.current = [];
    scrolling.current = false;
  });

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .maxDistance(TAP_MAX_DISTANCE)
        .maxDuration(TAP_MAX_DURATION_MS)
        .runOnJS(true)
        // Gesture Handler calls this only when a tap ends, never during render,
        // so reading refs inside onTap is safe here.
        // eslint-disable-next-line react-hooks/refs
        .onEnd((_event, success) => {
          if (success) onTap();
        }),
    [onTap],
  );

  const current = adhkar[index]!;
  const drawn = useDrawnPages(index, adhkar.length);

  return (
    <ReaderActionsContext.Provider value={readerActions}>
      <SafeAreaView
        edges={['top', 'bottom', 'left', 'right']}
        style={[styles.fill, { backgroundColor: colors.background }]}
      >
        {/* Header: not part of the tap zone. */}
        <ReaderHeader category={category} onReset={() => counterStore.reset(current.id)} />
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <ProgressSegments items={adhkar} current={index} />
          <View style={styles.meta}>
            <View>
              <AppText
                tone="muted"
                style={styles.position}
                accessibilityLabel={t('reader.position', {
                  current: index + 1,
                  total: adhkar.length,
                })}
              >
                <AppText style={styles.positionNow}>{String(index + 1)}</AppText>{' '}
                {t('reader.of', { total: adhkar.length })}
              </AppText>
              {/* When the audio counts, the counter already shows the progress. */}
              {!audioCounts &&
              audio.activeId === current.id &&
              audio.repeat &&
              audio.repeat.total > 1 ? (
                <AppText variant="caption" tone="muted">
                  {t('audio.repeat', {
                    current: audio.repeat.current,
                    total: audio.repeat.total,
                  })}
                </AppText>
              ) : null}
            </View>
            <View style={[styles.actions, { gap: spacing.sm }]}>
              <CompleteButton dhikr={current} onPress={onComplete} />
              {current.audioFile ? (
                <PlayButton
                  phase={audio.activeId === current.id ? audio.phase : 'idle'}
                  onPress={() => audio.toggle(current)}
                />
              ) : null}
            </View>
          </View>
          {audio.error ? (
            <AppText variant="caption" tone="danger" accessibilityRole="alert">
              {t(`audio.errors.${audio.error}`)}
            </AppText>
          ) : null}
        </View>

        {/* Tap zone: the dhikr and the counter. */}
        <GestureDetector gesture={tap}>
          <View style={[styles.fill, landscape && styles.row]} collapsable={false}>
            <PagerView
              // A new pager after its width changed (see onPagerLayout).
              key={pagerKey}
              ref={pagerRef}
              onLayout={onPagerLayout}
              style={styles.fill}
              initialPage={index}
              layoutDirection={isRtl ? 'rtl' : 'ltr'}
              offscreenPageLimit={1}
              onPageScrollStateChanged={(e) => {
                scrolling.current = e.nativeEvent.pageScrollState !== 'idle';
              }}
              onPageSelected={(e) => {
                const i = e.nativeEvent.position;
                const mine = pendingPages.current.indexOf(i);
                if (mine !== -1) {
                  // A move the reader made itself. If more moves followed (screen
                  // off), this event is out of date: the index is already further on.
                  pendingPages.current.splice(0, mine + 1);
                  if (i !== indexRef.current) return;
                } else {
                  // Not a scroll (a swipe or TalkBack's scroll): a layout change such
                  // as a rotation reports a wrong page. Keep the page.
                  if (!scrolling.current) return;
                  // The user swiped. A swipe during the short pause wins over the automatic move.
                  if (i !== indexRef.current) cancelAdvance();
                  indexRef.current = i;
                  setIndex(i);
                }
                audio.onShow(adhkar[i]!.id);
              }}
            >
              {adhkar.map((d, i) => (
                <View key={d.id} style={styles.fill} collapsable={false}>
                  {drawn(i) ? <DhikrPage dhikr={d} current={i === index} /> : null}
                </View>
              ))}
            </PagerView>

            <ReaderCounter dhikr={current} landscape={landscape} onTap={onTap} />
          </View>
        </GestureDetector>
      </SafeAreaView>
    </ReaderActionsContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // Same height with or without the play button, so the page never jumps.
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TOUCH_TARGET,
  },
  actions: { flexDirection: 'row', alignItems: 'center' },
  position: { fontSize: 13, lineHeight: 22 },
  positionNow: { fontFamily: UI_FONTS.semibold, fontSize: 15 },
  row: { flexDirection: 'row' },
});
