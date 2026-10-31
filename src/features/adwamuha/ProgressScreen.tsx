import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { useAppTheme } from '@/theme/ThemeProvider';

import { useAdwamuha } from './AdwamuhaProvider';
import { HadithCard } from './HadithCard';
import { type DayKey, addDays } from './logic/days';
import { SESSIONS, type Session } from './logic/sessions';
import { WEEK_TARGET } from './logic/commitment';
import { OWNER_TEXTS } from './owner-texts';
import { ReadOutsideSheet, YesterdaySheet } from './RecordSheets';
import { StepBackSheet } from './StepBackSheet';
import { StepRing } from './StepRing';
import { useProgress } from './useProgress';
import { WeekGrid } from './WeekGrid';

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
    if (text) toast.show({ message: text });
  };
  const selfRecorded = (date: DayKey, session: Session) =>
    (date === today || date === yesterday) &&
    records.some((r) => r.date === date && r.session === session && r.source === 'manual');
  const undo = (date: DayKey, session: Session) => {
    Alert.alert(
      t('adwamuha.masariHelp.undoTitle'),
      t('adwamuha.masariHelp.undoText', {
        ward: t(`adwamuha.sessionName.${session}`),
        when: t(date === today ? 'adwamuha.masari.todayWord' : 'adwamuha.masari.yesterdayWord'),
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('adwamuha.masariHelp.undo'),
          style: 'destructive',
          onPress: () => void undoFromMemory(session, date),
        },
      ],
    );
  };

  const ordinals = t('adwamuha.masariHelp.ordinals', { returnObjects: true }) as string[];
  const stageLine = finished
    ? t('adwamuha.masari.finishedStage')
    : t('adwamuha.masariHelp.stageLine', {
        ordinal: ordinals[progress.stage - 1] ?? String(progress.stage),
        title: progress.stageTitle,
      });
  const leftLine = onBreak
    ? t('adwamuha.masari.breakLeft')
    : finished
      ? t('adwamuha.masari.finishedLeft')
      : t('adwamuha.daysLeft', { count: progress.status.daysLeft });
  const tip = textFor('tip', finished ? 'maintenance' : `stage:${progress.stage}`);
  const nowDone = records.some((r) => r.date === today && r.session === now.session);
  const dayNames = t('adwamuha.masariHelp.dayNames', { returnObjects: true }) as string[];
  const breakDate = (date: DayKey) => {
    const [y, m, d] = date.split('-').map(Number) as [number, number, number];
    return t('adwamuha.masariHelp.breakDate', {
      day: dayNames[new Date(y, m - 1, d).getDay()] ?? '',
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
          <StepRing step={progress.step} total={progress.total} finished={finished} />
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
          <View style={[box, { borderColor: colors.accent }]}>
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
          {onBreak ? null : (
            // A line before the goal (owner, 2026-10-30; design `.goal`'s top border).
            <View
              testID="goal-divider"
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
          )}
          {onBreak ? null : progress.thisWeek.full ? (
            <View style={{ gap: spacing.sm }}>
              <AppText variant="label" tone="muted">
                {t(finished ? 'adwamuha.masari.goalTitle' : 'adwamuha.masari.goalMoveOn')}
              </AppText>
              {SESSIONS.map((s) => (
                <GoalBar key={s} session={s} count={progress.thisWeek[s]} />
              ))}
            </View>
          ) : (
            // The step began inside this week (or a break cut it): it does not count yet.
            <AppText variant="caption" tone="muted">
              {t('adwamuha.masari.firstWeekGoal')}
            </AppText>
          )}
        </View>

        {tip ? (
          <View
            style={[
              styles.row,
              {
                gap: spacing.md,
                padding: spacing.lg,
                borderRadius: radii.lg,
                backgroundColor: colors.accentSoft,
              },
            ]}
          >
            <Icon name="bulb" color={colors.accent} />
            <AppText style={styles.fill}>{tip}</AppText>
          </View>
        ) : null}

        {activeBreak ? (
          <Button
            title={t('adwamuha.masari.endBreak')}
            onPress={() =>
              void endBreak().then(() => toast.show({ message: t('adwamuha.masari.breakEnded') }))
            }
          />
        ) : !nowDone ? (
          <Button
            title={t(`adwamuha.openWard.${now.session}`)}
            onPress={() =>
              router.push({
                pathname: '/adwamuha/ward/[session]',
                params: { session: now.session },
              })
            }
          />
        ) : null}

        {onBreak ? null : (
          <Pressable
            accessibilityRole="button"
            onPress={() => setReadOpen(true)}
            style={({ pressed }) => [
              styles.row,
              box,
              { gap: spacing.md, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <View style={[styles.mark, { backgroundColor: colors.surfaceMuted }]}>
              <Icon name="check" size={18} color={colors.primary} />
            </View>
            <View style={styles.fill}>
              <AppText variant="bodyStrong">{t('adwamuha.masari.readOutside')}</AppText>
              <AppText variant="caption" tone="muted">
                {t('adwamuha.masari.readOutsideNote')}
              </AppText>
            </View>
          </Pressable>
        )}

        <View style={[styles.row, styles.links, { gap: spacing.lg }]}>
          {finished ? (
            <LinkText
              title={t('adwamuha.masari.turnOff')}
              onPress={() => void turnOff().then(() => router.back())}
            />
          ) : (
            <LinkText
              title={t('adwamuha.masari.lifeChange')}
              onPress={() => setStepBackOpen(true)}
            />
          )}
          <LinkText
            title={OWNER_TEXTS.labels.editPlan}
            onPress={() => router.push('/adwamuha/plan')}
          />
        </View>
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

function LinkText({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={styles.link}>
      <AppText variant="label" tone="primary">
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center', alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center' },
  dim: { opacity: 0.45 },
  divider: { height: StyleSheet.hairlineWidth, marginTop: 4 },
  mark: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  barName: { width: 64 },
  segment: { flex: 1, height: 8, borderRadius: 4 },
  barText: { minWidth: 64, textAlign: 'right' },
  links: { justifyContent: 'center', flexWrap: 'wrap' },
  link: { minHeight: 44, justifyContent: 'center' },
});
