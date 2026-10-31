import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  type LayoutChangeEvent,
  Linking,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import PagerView from 'react-native-pager-view';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { ProgressRing } from '@/components/ProgressRing';
import { useToast } from '@/components/Toast';
import { useRepositories } from '@/data/DataProvider';
import type { Category, Dhikr } from '@/data/models';
import { useSettings } from '@/data/settings/SettingsProvider';
import { useAdwamuhaOptional } from '@/features/adwamuha/AdwamuhaProvider';
import { PlayButton } from '@/features/audio/PlayButton';
import { type DhikrAudio, useDhikrAudio } from '@/features/audio/useDhikrAudio';
import { counterStore } from '@/features/counter/counter-store';
import { useCounters } from '@/features/counter/useCounters';
import { haptics } from '@/features/feedback/haptics';
import { useTickSound } from '@/features/feedback/useTickSound';
import { useDirection } from '@/i18n/direction';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TOUCH_TARGET } from '@/theme/tokens';

import { CompleteButton } from './CompleteButton';
import { DhikrPage } from './DhikrPage';
import { afterComplete, initialIndex } from './navigation';
import { ProgressSegments } from './ProgressSegments';
import { ReaderActionsContext } from './reader-actions';
import { useCategoryAdhkar } from './useCategoryAdhkar';

/** Pause after a dhikr is complete, so the full ring is seen before moving on. */
const ADVANCE_DELAY_MS = 450;

const KEEP_AWAKE_TAG = 'wirduk-reader';

/**
 * A short tap counts; a scroll or a swipe never does.
 * `maxDistance` fails the tap as soon as the finger moves (scrolling the text
 * or swiping the pager), and `maxDuration` ignores long presses.
 */
const TAP_MAX_DISTANCE = 10;
const TAP_MAX_DURATION_MS = 350;

export function ReaderScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ id: string; dhikr?: string }>();
  const state = useCategoryAdhkar(Number(params.id));

  // Own categories can be edited from here: show the changes when coming back.
  useFocusEffect(state.reload);

  if (state.status === 'loading') {
    return <View style={[styles.fill, { backgroundColor: colors.background }]} />;
  }
  if (state.status !== 'ready') {
    return (
      <SafeAreaView style={[styles.fill, styles.center, { backgroundColor: colors.background }]}>
        <AppText tone="muted">{t('reader.notFound')}</AppText>
      </SafeAreaView>
    );
  }
  if (state.adhkar.length === 0) return <EmptyCustomCategory category={state.category} />;
  return (
    <Reader
      // A new key after an edit restarts the pager with the updated list.
      key={state.adhkar.map((d) => `${d.id}:${d.count}`).join(',')}
      category={state.category}
      adhkar={state.adhkar}
      startDhikrId={params.dhikr ? Number(params.dhikr) : undefined}
    />
  );
}

function ReaderHeader({ category, onReset }: { category: Category; onReset?: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { spacing } = useAppTheme();
  return (
    <View style={[styles.header, { paddingHorizontal: spacing.xs }]}>
      <IconButton icon="back" label={t('common.back')} onPress={() => router.back()} />
      <AppText variant="heading" numberOfLines={1} style={styles.title} accessibilityRole="header">
        {category.title}
      </AppText>
      {category.custom && (
        <IconButton
          icon="edit"
          label={t('custom.editCategory')}
          onPress={() =>
            router.push({ pathname: '/custom/[id]', params: { id: String(category.id) } })
          }
        />
      )}
      {onReset && <IconButton icon="reset" label={t('reader.reset')} onPress={onReset} />}
    </View>
  );
}

/** A new own category with no adhkar yet. */
function EmptyCustomCategory({ category }: { category: Category }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, spacing } = useAppTheme();
  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.fill, { backgroundColor: colors.background }]}
    >
      <ReaderHeader category={category} />
      <View style={[styles.fill, styles.center, { padding: spacing.xl, gap: spacing.lg }]}>
        <AppText tone="muted">{t('custom.noAdhkar')}</AppText>
        <Button
          title={t('custom.addDhikr')}
          onPress={() =>
            router.push({
              pathname: '/custom/[id]/dhikr/[dhikrId]',
              params: { id: String(category.id), dhikrId: 'new' },
            })
          }
        />
      </View>
    </SafeAreaView>
  );
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
}

export function Reader({ category, adhkar, startDhikrId, onFinished, ward }: ReaderProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { isRtl } = useDirection();
  const { settings } = useSettings();
  const { colors, spacing } = useAppTheme();
  const counters = useCounters();

  const [index, setIndex] = useState(() =>
    initialIndex(
      adhkar.map((d) => d.id),
      startDhikrId,
      (i) => counterStore.isComplete(adhkar[i]!),
    ),
  );
  const indexRef = useRef(index);
  const pagerRef = useRef<PagerView>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Pages the reader moved to itself, whose "page selected" event has not come yet. */
  const pendingPages = useRef<number[]>([]);

  const cancelAdvance = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
  };
  useEffect(() => cancelAdvance, []);

  // Leaving the reader (back, home, or the completion screen) starts this
  // category from zero next time (owner decision 2026-10-17). The ids are fixed
  // for this instance: a reload on focus gives a new array with the same ids,
  // and a changed list mounts a new Reader (see its key).
  const [ids] = useState(() => adhkar.map((d) => d.id));
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

  /**
   * After the dhikr at `from` is complete: a short pause, then the next open
   * dhikr or the completion screen. With the screen off it happens at once
   * (JS timers wait until the screen is on). Returns the next dhikr, or null.
   */
  const adwamuha = useAdwamuhaOptional();
  const advanceAfterComplete = useCallback(
    (from: number): Dhikr | null => {
      cancelAdvance();
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
      if (AppState.currentState === 'background') go();
      else advanceTimer.current = setTimeout(go, ADVANCE_DELAY_MS);
      return next.type === 'goto' ? adhkar[next.index]! : null;
    },
    [adhkar, adwamuha, category.id, moveTo, nextVibration, onFinished, router],
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

  // Keep the screen on while reading (setting, on by default).
  const keepScreenOn = settings.keepScreenOn;
  useEffect(() => {
    if (!keepScreenOn) return;
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    return () => void deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
  }, [keepScreenOn]);

  // "Continue where I stopped" (setting): save the place and the counts when the
  // app goes to the background; forget them when it comes back (still in memory).
  const { session } = useRepositories();
  const restoreOn = settings.restoreSession;
  useEffect(() => {
    if (!restoreOn) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        const counts: Record<string, number> = {};
        for (const d of adhkar) {
          const n = counterStore.get(d.id);
          if (n > 0) counts[String(d.id)] = n;
        }
        const dhikr = adhkar[indexRef.current] ?? adhkar[0]!;
        void session
          .save({ categoryId: category.id, dhikrId: dhikr.id, counts, ...(ward ? { ward } : {}) })
          .catch(() => undefined);
      } else if (state === 'active') {
        void session.clear().catch(() => undefined);
      }
    });
    return () => sub.remove();
  }, [adhkar, category.id, restoreOn, session, ward]);

  // A tap on "عرض في الدرر السنية" is often a counting tap that landed there:
  // it counts, and a toast offers to open Dorar.
  const toast = useToast();
  const onDorarPress = useCallback(
    (url: string) => {
      onTap();
      toast.show({ message: t('reader.dorarToast'), onPress: () => void Linking.openURL(url) });
    },
    [onTap, t, toast],
  );
  const readerActions = useMemo(() => ({ onDorarPress }), [onDorarPress]);

  // Landscape: the text and the counter side by side.
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  /** The pager is being dragged or is settling (a real page change, not a layout one). */
  const scrolling = useRef(false);
  /**
   * A new pager each time its width changes (a rotation, split screen): the old
   * one keeps its scroll offset in pixels of the old width and stops between
   * two pages. The key changes only after the new width is measured, so the new
   * pager is laid out at its final width.
   */
  const pagerWidth = useRef(0);
  const [pagerGeneration, setPagerGeneration] = useState(0);
  const onPagerLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (pagerWidth.current !== 0 && w !== pagerWidth.current) setPagerGeneration((g) => g + 1);
    pagerWidth.current = w;
  }, []);
  // Events of the old pager are gone with it.
  useEffect(() => {
    pendingPages.current = [];
    scrolling.current = false;
  }, [pagerGeneration]);

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
  const done = counters.get(current.id);
  const complete = adhkar.map((d) => counters.isComplete(d));

  return (
    <ReaderActionsContext.Provider value={readerActions}>
      <SafeAreaView
        edges={['top', 'bottom', 'left', 'right']}
        style={[styles.fill, { backgroundColor: colors.background }]}
      >
        {/* Header: not part of the tap zone. */}
        <ReaderHeader category={category} onReset={() => counterStore.reset(current.id)} />
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <ProgressSegments complete={complete} current={index} />
          <View style={styles.meta}>
            <View>
              <AppText variant="caption" tone="muted">
                {t('reader.position', { current: index + 1, total: adhkar.length })}
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
              <CompleteButton done={counters.isComplete(current)} onPress={onComplete} />
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
              key={pagerGeneration}
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
              {adhkar.map((d) => (
                <View key={d.id} style={styles.fill} collapsable={false}>
                  <DhikrPage dhikr={d} />
                </View>
              ))}
            </PagerView>

            <View
              style={[
                styles.counter,
                landscape
                  ? { justifyContent: 'center', paddingHorizontal: spacing.lg, gap: spacing.sm }
                  : { paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.sm },
              ]}
              accessible
              accessibilityRole="button"
              accessibilityLabel={t('reader.counter', { done, total: current.count })}
              accessibilityHint={t('reader.counterHint')}
              accessibilityActions={[{ name: 'activate' }]}
              onAccessibilityAction={(e) => {
                if (e.nativeEvent.actionName === 'activate') onTap();
              }}
            >
              <ProgressRing progress={done / current.count} completeColor={colors.primary}>
                <AppText style={styles.count}>{String(done)}</AppText>
                <AppText variant="caption" tone="muted">
                  {t('reader.of', { total: current.count })}
                </AppText>
              </ProgressRing>
              <AppText variant="caption" tone="faint" style={styles.hint}>
                {t('reader.hint')}
              </AppText>
            </View>
          </View>
        </GestureDetector>
      </SafeAreaView>
    </ReaderActionsContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center' },
  // Same height with or without the play button, so the page never jumps.
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TOUCH_TARGET,
  },
  actions: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center' },
  row: { flexDirection: 'row' },
  counter: { alignItems: 'center' },
  hint: { textAlign: 'center', maxWidth: 260 },
  count: { fontFamily: UI_FONTS.semibold, fontSize: 34, lineHeight: 40 },
});
