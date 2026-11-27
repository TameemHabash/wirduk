import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useDialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { IconTile } from '@/components/ui/IconTile';
import { useToast } from '@/components/ui/Toast';
import { useAppTheme } from '@/theme/ThemeProvider';

import { useAdwamuha } from '@/features/adwamuha/state/AdwamuhaProvider';
import { BeadPath } from '@/features/adwamuha/components/BeadPath';
import { PlanRows } from '@/features/adwamuha/components/PlanRows';
import { HadithCard } from '@/features/adwamuha/components/HadithCard';
import { addDays } from '@/features/adwamuha/logic/days';
import { WEEK_TARGET } from '@/features/adwamuha/logic/commitment';
import { weekdayOf } from '@/features/adwamuha/logic/weeks';
import { OWNER_TEXTS } from '@/features/adwamuha/generated/owner-texts';
import { ReadOutsideSheet, YesterdaySheet } from '@/features/adwamuha/components/RecordSheets';
import { StepBackSheet } from '@/features/adwamuha/components/StepBackSheet';
import { useProgress } from '@/features/adwamuha/hooks/useProgress';
import { WeekGrid } from '@/features/adwamuha/components/WeekGrid';
import { type DayKey, type Session, SESSIONS } from '@/data/models';

/**
 * «مساري» (the owner's design): the ring (the step, the stage, the days left),
 * the hadith, «تتبّع الأسبوع» (this calendar week, the goal bars), the stage's
 * tip, the ward to read now, recording a ward read outside the app, and the
 * links. No streaks, no points, no percentages. One-time messages are on Home.
 */
export function ProgressScreen() {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useAppTheme();
  const router = useRouter();
  const toast = useToast();
  const dialog = useDialog();
  const {
    ready,
    enabled,
    records,
    slot,
    readyToMoveOn,
    advance,
    postpone,
    activeBreak,
    endBreak,
    undoFromMemory,
    turnOff,
    textFor,
  } = useAdwamuha();
  const progress = useProgress();
  const [readOpen, setReadOpen] = useState(false);
  const [yesterdayWard, setYesterdayWard] = useState<Session | null>(null);
  const [stepBackOpen, setStepBackOpen] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const toTop = () => scroll.current?.scrollTo({ y: 0, animated: true });

  if (ready && !enabled) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={[styles.fill, styles.center, { backgroundColor: colors.background }]}
      >
        <AppText tone="muted">{t('adwamuha.notOn')}</AppText>
      </SafeAreaView>
    );
  }
  if (!progress) return <View style={[styles.fill, { backgroundColor: colors.background }]} />;

  const now = slot();
  const today = now.date;
  const yesterday = addDays(today, -1);
  const finished = progress.maintenance;
  const onBreak = activeBreak !== null;
  // A word of thanks after recording a ward (the owner's).
  const thanks = () => {
    const text = textFor('wardDone', '');
    if (text) toast.show({ message: text, icon: 'check', tone: 'gold' });
  };
  const selfRecorded = (date: DayKey, session: Session) =>
    (date === today || date === yesterday) &&
    records.some((r) => r.date === date && r.session === session && r.source === 'manual');
  const undo = (date: DayKey, session: Session) => {
    dialog.show({
      icon: 'undo',
      tone: 'danger',
      title: t('adwamuha.masariHelp.undoTitle'),
      body: t('adwamuha.masariHelp.undoText', {
        ward: t(`adwamuha.sessionName.${session}`),
        when: t(date === today ? 'adwamuha.masari.todayWord' : 'adwamuha.masari.yesterdayWord'),
      }),
      actions: [
        {
          label: t('adwamuha.masariHelp.undo'),
          kind: 'danger',
          onPress: () => void undoFromMemory(session, date),
        },
        { label: t('common.cancel'), cancel: true },
      ],
    });
  };

  const ordinals = t('adwamuha.masariHelp.ordinals', { returnObjects: true }) as string[];
  const stageLine = finished
    ? t('adwamuha.masari.finishedStage')
    : t('adwamuha.masariHelp.stageLine', {
        ordinal: ordinals[progress.stage - 1] ?? String(progress.stage),
        title: progress.stageTitle,
      });
  // The step's good weeks so far (owner, 2026-11-14: a week counts once it has 4 and 4).
  const leftLine = onBreak
    ? t('adwamuha.masari.breakLeft')
    : finished
      ? t('adwamuha.masari.finishedLeft')
      : t('adwamuha.weeksDone', {
          done: Math.min(progress.status.goodWeeks, progress.status.weeksNeeded),
          total: progress.status.weeksNeeded,
        });
  const tip = textFor('tip', finished ? 'maintenance' : `stage:${progress.stage}`);
  const dayNames = t('adwamuha.masariHelp.dayNames', { returnObjects: true }) as string[];
  const breakDate = (date: DayKey) => {
    const [, m, d] = date.split('-').map(Number) as [number, number, number];
    return t('adwamuha.masariHelp.breakDate', {
      day: dayNames[weekdayOf(date)] ?? '',
      date: `${d}/${m}`,
    });
  };
  const box = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  };

  return (
    <SafeAreaView edges={['bottom']} style={[styles.fill, { backgroundColor: colors.background }]}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <View style={{ gap: spacing.xs, paddingTop: spacing.sm }}>
          <BeadPath step={progress.step} total={progress.total} finished={finished} />
          <AppText tone="muted" style={[styles.centerText, { marginTop: spacing.sm }]}>
            {stageLine}
          </AppText>
          <AppText variant="caption" tone="muted" style={styles.centerText}>
            {leftLine}
          </AppText>
        </View>

        <HadithCard />

        {readyToMoveOn ? (
          // The move-on question stays here until answered (owner, 2026-10-29).
          <View style={[box, { borderColor: colors.accent, borderWidth: 1.5 }]}>
            <AppText variant="heading" accessibilityRole="header">
              {OWNER_TEXTS.labels.readyQuestion}
            </AppText>
            <Button title={OWNER_TEXTS.labels.addNext} onPress={() => void advance().then(toTop)} />
            <Button
              title={OWNER_TEXTS.labels.keepWeek}
              kind="secondary"
              onPress={() => void postpone()}
            />
          </View>
        ) : null}

        <View style={box}>
          {activeBreak ? (
            <View
              style={{
                backgroundColor: colors.accentSoft,
                borderRadius: radii.md,
                padding: spacing.md,
                gap: 2,
              }}
            >
              <AppText variant="bodyStrong">
                {t('adwamuha.masari.breakUntil', { date: breakDate(activeBreak.to) })}
              </AppText>
              <AppText variant="caption">{t('adwamuha.masari.breakText')}</AppText>
            </View>
          ) : null}
          <AppText variant="heading" accessibilityRole="header">
            {t('adwamuha.masari.weekTitle')}
          </AppText>
          <View style={onBreak && styles.dim}>
            <WeekGrid
              grid={progress.grid}
              today={today}
              selfRecorded={selfRecorded}
              onRecordYesterday={setYesterdayWard}
              onUndo={undo}
              onOlderDay={() => toast.show({ message: t('adwamuha.masari.olderDay') })}
            />
          </View>
          {/* A line before the goal (owner, 2026-10-30; design `.goal`'s top border). */}
          <View
            testID="goal-divider"
            style={[styles.divider, { backgroundColor: colors.border }]}
          />
          {/*
            The goal bars, always (owner, 2026-11-14): a week counts for the step only once it
            has 4 mornings and 4 evenings, also the week the step began in or a break cut.
          */}
          <View style={[{ gap: spacing.sm }, onBreak && styles.dim]}>
            <AppText variant="label" tone="muted">
              {t(finished ? 'adwamuha.masari.goalTitle' : 'adwamuha.masari.goalMoveOn')}
            </AppText>
            {SESSIONS.map((s) => (
              <GoalBar key={s} session={s} count={progress.thisWeek[s]} />
            ))}
            {!finished && progress.thisWeek.stepBeganInside ? (
              // Its days before the step count for nothing: say why the bars show less than the dots.
              <AppText variant="caption" tone="muted">
                {t('adwamuha.masariHelp.stepWeekNote')}
              </AppText>
            ) : null}
          </View>
        </View>

        {tip ? (
          <View
            style={[
              styles.row,
              {
                gap: spacing.md,
                paddingVertical: 14,
                paddingHorizontal: spacing.lg,
                borderRadius: 20,
                backgroundColor: colors.primarySoft,
                alignItems: 'flex-start',
              },
            ]}
          >
            <Icon name="bulb" color={colors.primaryInk} />
            <AppText style={styles.fill}>{tip}</AppText>
          </View>
        ) : null}

        {activeBreak ? (
          <Button
            title={t('adwamuha.masari.endBreak')}
            onPress={() =>
              void endBreak().then(() =>
                toast.show({ message: t('adwamuha.masari.breakEnded'), icon: 'check' }),
              )
            }
          />
        ) : null}
        {/* No «افتح ورد…» button here (owner, 2026-11-26): the ward opens from Home. */}

        {onBreak ? null : (
          <Pressable
            accessibilityRole="button"
            onPress={() => setReadOpen(true)}
            style={({ pressed }) => [
              styles.row,
              styles.mini,
              {
                borderColor: colors.border,
                backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
              },
            ]}
          >
            <IconTile icon="check" />
            <View style={styles.fill}>
              <AppText variant="bodyStrong">{t('adwamuha.masari.readOutside')}</AppText>
              <AppText variant="caption" tone="muted">
                {t('adwamuha.masari.readOutsideNote')}
              </AppText>
            </View>
            <Icon name="forward" size={18} color={colors.textFaint} />
          </Pressable>
        )}

        {/* Two rows with a note each (owner, 2026-11-25), as in «أدومها» settings. */}
        <PlanRows
          finished={finished}
          onEase={() => setStepBackOpen(true)}
          onTurnOff={() => void turnOff().then(() => router.back())}
        />
      </ScrollView>
      <ReadOutsideSheet visible={readOpen} onClose={() => setReadOpen(false)} onRecorded={thanks} />
      <YesterdaySheet
        session={yesterdayWard}
        onClose={() => setYesterdayWard(null)}
        onRecorded={thanks}
      />
      <StepBackSheet visible={stepBackOpen} onClose={() => setStepBackOpen(false)} onDone={toTop} />
    </SafeAreaView>
  );
}

/** A week's goal for one ward (design): 4 segments, «N من 4» or «✓ تحقّق». */
function GoalBar({ session, count }: { session: Session; count: number }) {
  const { t } = useTranslation();
  const { colors, spacing } = useAppTheme();
  const met = count >= WEEK_TARGET;
  const text = met ? t('adwamuha.masari.goalMet') : t('adwamuha.masari.goalCount', { count });
  const name = t(`adwamuha.sessionName.${session}`);
  return (
    <View
      accessible
      accessibilityLabel={`${name}: ${text}`}
      style={[styles.row, { gap: spacing.sm }]}
    >
      <AppText style={styles.barName}>{name}</AppText>
      <View style={[styles.row, styles.fill, { gap: 4 }]}>
        {Array.from({ length: WEEK_TARGET }, (_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              { backgroundColor: i < count ? colors.primary : colors.surfaceMuted },
            ]}
          />
        ))}
      </View>
      <AppText variant="label" tone={met ? 'primary' : 'muted'} style={styles.barText}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center', alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center' },
  dim: { opacity: 0.45 },
  divider: { height: StyleSheet.hairlineWidth, marginTop: 4 },
  mini: { gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1 },
  barName: { width: 64 },
  segment: { flex: 1, height: 8, borderRadius: 4 },
  barText: { minWidth: 64, textAlign: 'right' },
});
