import { type ReactNode, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { GoldCard } from '@/components/ui/GoldCard';
import { Icon } from '@/components/ui/Icon';
import { useSettings } from '@/data/settings/SettingsProvider';
import { displayTime } from '@/lib/time';
import { DISPLAY_FONT, UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { useAdwamuha } from '@/features/adwamuha/state/AdwamuhaProvider';
import { MessageCard } from './MessageCard';
import { OWNER_TEXTS } from '@/features/adwamuha/generated/owner-texts';
import { setupShownKey } from '@/features/adwamuha/logic/setup';
import { StepBackSheet } from './StepBackSheet';
import { useProgress } from '@/features/adwamuha/hooks/useProgress';
import { type Session, SESSIONS } from '@/data/models';

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
    textFor,
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
  // Both wards done: the owner's prayer only (owner, 2026-10-29; kept on Home, 2026-11-21).
  const prayer = bothDone ? textFor('bothDone', '') : null;
  const wardSize = wardIds(show.session).length;

  return (
    // Golden as the morning or evening card it replaces (owner, 2026-11-25).
    <GoldCard period={now.session}>
      <View style={[styles.row, { gap: spacing.sm }]}>
        <AppText accessibilityRole="header" style={[styles.fill, styles.title]}>
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
              backgroundColor: colors.heroBox,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <AppText roomy style={[styles.chip, { color: colors.primaryInk }]}>
            {progress.maintenance
              ? t('adwamuha.home.maintenance')
              : OWNER_TEXTS.labels.stepOf
                  .replace('{{step}}', String(progress.step))
                  .replace('{{total}}', String(progress.total))}
          </AppText>
          <Icon name="forward" size={14} color={colors.primaryInk} />
        </Pressable>
      </View>

      <AppText style={[styles.hadith, { color: colors.accentInk, fontFamily: DISPLAY_FONT }]}>
        {OWNER_TEXTS.hadith.text}
      </AppText>

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
        prayer !== null ? (
          <AppText style={[styles.prayer, { fontFamily: DISPLAY_FONT }]}>{prayer}</AppText>
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
    </GoldCard>
  );
}

function OnceBox({ children }: { children: ReactNode }) {
  const { colors, radii, spacing } = useAppTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: colors.heroBox,
        borderRadius: radii.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg - 2,
        gap: spacing.sm + 2,
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
          gap: spacing.sm + 2,
          padding: 10,
          borderRadius: radii.md,
          borderWidth: 1.5,
          borderColor: state === 'now' ? colors.primary : 'transparent',
          backgroundColor: colors.heroBox,
        },
      ]}
    >
      <View
        // A new view for each state: the Galaxy S21+ drew a round view square after it
        // changed in place from a border to a fill (2026-11-01).
        key={state}
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
          <Icon
            name={state === 'late' ? 'clock' : 'check'}
            size={15}
            strokeWidth={2.2}
            color={colors.onPrimary}
          />
        ) : null}
      </View>
      <View style={styles.fill}>
        <AppText style={styles.wardName}>{name}</AppText>
        <AppText variant="caption" tone={filled ? 'primaryInk' : 'muted'}>
          {word}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: UI_FONTS.semibold, fontSize: 19, lineHeight: 28 },
  chip: { fontFamily: UI_FONTS.semibold, fontSize: 13, lineHeight: 20 },
  hadith: { fontSize: 18, lineHeight: 31 },
  wardName: { fontFamily: UI_FONTS.semibold, fontSize: 15, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center' },
  fill: { flex: 1 },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  prayer: { fontSize: 21, lineHeight: 38, textAlign: 'center', alignSelf: 'stretch' },
  box: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  mark: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
