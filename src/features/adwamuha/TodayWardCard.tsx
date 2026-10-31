import { type ReactNode, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { DhikrText } from '@/components/DhikrText';
import { Icon } from '@/components/Icon';
import { useSettings } from '@/data/settings/SettingsProvider';
import { displayTime } from '@/features/reminders/reminder-time';
import { DISPLAY_FONT } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { useAdwamuha } from './AdwamuhaProvider';
import { SESSIONS, type Session } from './logic/sessions';
import { MessageCard } from './MessageCard';
import { OWNER_TEXTS } from './owner-texts';
import { setupShownKey } from './setup';
import { StepBackSheet } from './StepBackSheet';
import { useProgress } from './useProgress';

/** A ward's state on Home (design: ✓ done, clock late, framed = its time now, dashed = not yet). */
type WardState = 'done' | 'late' | 'now' | 'notYet' | 'missed';

/**
 * Home's top card «وردك اليوم» (only when Adwamuha is on), the one thing that
 * stands out on Home (design): the step (a link to «مساري»), the hadith in a
 * small line, the one-time message or question, today's two wards, and one
 * button for the ward that can count now (owner: 12:00–16:00 the morning if
 * not done, else the evening; 00:00–04:00 last evening if not done). After
 * both wards: only the owner's prayer, no button.
 */
export function TodayWardCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, radii, spacing } = useAppTheme();
  const { settings } = useSettings();
  const {
    ready,
    enabled,
    records,
    slot,
    wardIds,
    readyToMoveOn,
    advance,
    postpone,
    suggestStepBack,
    dismissSuggestion,
    messages,
    messageFor,
    shown,
    markShown,
  } = useAdwamuha();
  const progress = useProgress();
  const now = slot();
  const [stepBackOpen, setStepBackOpen] = useState(false);

  // The setup screens: on the first launch, and once after each app update, while
  // «أدومها» is off (owner, 2026-10-29). Never while it is on.
  useEffect(() => {
    const key = setupShownKey();
    if (!ready || enabled || shown.has(key)) return;
    void markShown(key).then((first) => {
      if (first) router.push('/adwamuha/intro');
    });
  }, [enabled, markShown, ready, router, shown]);

  if (!enabled || !progress) return null;

  const record = (s: Session) =>
    records.find((r) => r.date === now.date && r.session === s) ?? null;
  const stateOf = (s: Session): WardState => {
    const r = record(s);
    if (r) return r.late ? 'late' : 'done';
    if (s === now.session) return 'now';
    // The morning is over once the evening began; the evening is still ahead in the morning.
    return s === 'morning' ? 'missed' : 'notYet';
  };
  const bothDone = SESSIONS.every((s) => record(s) !== null);
  const other: Session = now.session === 'morning' ? 'evening' : 'morning';
  // The ward that can count now; or, once it is done, when the other one starts.
  const show: { session: Session; open: boolean } = record(now.session)
    ? { session: other, open: false }
    : { session: now.session, open: true };
  const times = settings.wardTimes;
  const startsAt = displayTime(
    show.session === 'evening' ? times.eveningStart : times.morningStart,
    t('settings.am'),
    t('settings.pm'),
  );
  const prayer = bothDone ? messageFor('bothDone', `both:${now.date}`) : null;
  const wardSize = wardIds(show.session).length;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.primary,
          borderRadius: radii.lg,
          padding: spacing.lg,
          gap: spacing.md,
        },
      ]}
    >
      <View style={[styles.row, { gap: spacing.sm }]}>
        <AppText variant="heading" accessibilityRole="header" style={styles.fill}>
          {OWNER_TEXTS.labels.todayWard}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={OWNER_TEXTS.labels.progressTitle}
          onPress={() => router.push('/adwamuha')}
          hitSlop={8}
          style={({ pressed }) => [
            styles.row,
            {
              gap: spacing.xs,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderRadius: radii.pill,
              backgroundColor: colors.surfaceMuted,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <AppText variant="label" tone="primary">
            {progress.maintenance
              ? t('adwamuha.home.maintenance')
              : OWNER_TEXTS.labels.stepOf
                  .replace('{{step}}', String(progress.step))
                  .replace('{{total}}', String(progress.total))}
          </AppText>
          <Icon name="forward" size={14} color={colors.primary} />
        </Pressable>
      </View>

      <DhikrText size={17} style={{ color: colors.accent }}>
        {OWNER_TEXTS.hadith.text}
      </DhikrText>

      {/*
        The one-time place: a message due (once, tied to what just happened), then the
        move-on question and the gentle suggestion (they stay until answered).
      */}
      {messages.length > 0 ? (
        <MessageCard />
      ) : readyToMoveOn ? (
        <OnceBox>
          <AppText variant="bodyStrong">{OWNER_TEXTS.labels.readyQuestion}</AppText>
          <Button title={OWNER_TEXTS.labels.addNext} onPress={() => void advance()} />
          <Button
            title={OWNER_TEXTS.labels.keepWeek}
            kind="secondary"
            onPress={() => void postpone()}
          />
        </OnceBox>
      ) : suggestStepBack ? (
        // The gentle suggestion (low commitment): once, then not for 14 days.
        <OnceBox>
          <AppText>{t('adwamuha.stepBack.suggestion')}</AppText>
          <View style={[styles.row, { gap: spacing.sm }]}>
            <Button
              title={t('adwamuha.stepBack.suggestionYes')}
              kind="secondary"
              style={styles.fill}
              onPress={() => {
                setStepBackOpen(true);
                void dismissSuggestion();
              }}
            />
            <Button
              title={t('adwamuha.stepBack.suggestionNo')}
              kind="secondary"
              style={styles.fill}
              onPress={() => void dismissSuggestion()}
            />
          </View>
        </OnceBox>
      ) : null}
      <StepBackSheet visible={stepBackOpen} onClose={() => setStepBackOpen(false)} suggestion />

      <View style={[styles.row, { gap: spacing.sm }]}>
        {SESSIONS.map((s) => (
          <WardBox key={s} session={s} state={stateOf(s)} />
        ))}
      </View>

      {bothDone ? (
        prayer?.kind === 'owner' ? (
          <AppText style={[styles.prayer, { fontFamily: DISPLAY_FONT }]}>{prayer.text}</AppText>
        ) : null
      ) : show.open ? (
        <View style={{ gap: spacing.xs }}>
          <Button
            title={t(`adwamuha.openWard.${show.session}`)}
            onPress={() =>
              router.push({
                pathname: '/adwamuha/ward/[session]',
                params: { session: show.session },
              })
            }
          />
          <AppText variant="caption" tone="muted" style={styles.center}>
            {t('adwamuha.wardCount', { countText: t('home.adhkarCount', { count: wardSize }) })}
          </AppText>
        </View>
      ) : (
        <AppText tone="muted" style={styles.center}>
          {t('adwamuha.startsAt', {
            ward: t(`adwamuha.wardTitle.${show.session}`),
            time: startsAt,
          })}
        </AppText>
      )}
    </View>
  );
}

function OnceBox({ children }: { children: ReactNode }) {
  const { colors, radii, spacing } = useAppTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: colors.surfaceMuted,
        borderRadius: radii.md,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      {children}
    </View>
  );
}

/** One of today's two wards, with its state as in «مساري» (an icon and a word). */
function WardBox({ session, state }: { session: Session; state: WardState }) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useAppTheme();
  const name = t(`adwamuha.sessionName.${session}`);
  const word = t(`adwamuha.home.${state}`);
  const filled = state === 'done' || state === 'late';
  return (
    <View
      accessible
      accessibilityLabel={`${name}: ${word}`}
      style={[
        styles.box,
        {
          gap: spacing.sm,
          padding: spacing.sm,
          borderRadius: radii.md,
          borderWidth: state === 'now' ? 2 : 1,
          borderColor: state === 'now' ? colors.primary : colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.mark,
          filled
            ? { backgroundColor: state === 'late' ? colors.accent : colors.primary }
            : {
                borderWidth: 2,
                borderColor: state === 'now' ? colors.primary : colors.textFaint,
                borderStyle: state === 'notYet' ? 'dashed' : 'solid',
              },
        ]}
      >
        {filled ? (
          <Icon name={state === 'late' ? 'clock' : 'check'} size={14} color={colors.onPrimary} />
        ) : null}
      </View>
      <View style={styles.fill}>
        <AppText variant="bodyStrong">{name}</AppText>
        <AppText variant="caption" tone={filled ? 'primary' : 'muted'}>
          {word}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center' },
  fill: { flex: 1 },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  prayer: { fontSize: 20, lineHeight: 36, textAlign: 'center', alignSelf: 'stretch' },
  box: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  mark: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
