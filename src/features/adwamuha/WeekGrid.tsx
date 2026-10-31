import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { useAppTheme } from '@/theme/ThemeProvider';

import { type DayKey, addDays } from './logic/days';
import { SESSIONS, type Session } from './logic/sessions';
import type { DayStatus, GridDay } from './logic/weeks';

const DOT = 28;

interface Props {
  /** This calendar week (from «بداية الأسبوع» in the settings). */
  grid: GridDay[];
  today: DayKey;
  /** A ward of today or yesterday the user recorded themselves (a tap undoes it). */
  selfRecorded: (date: DayKey, session: Session) => boolean;
  onRecordYesterday: (session: Session) => void;
  onUndo: (date: DayKey, session: Session) => void;
  /** A tap on an older empty dot: only today and yesterday can be recorded. */
  onOlderDay: () => void;
}

/**
 * «تتبّع الأسبوع» (design): a morning dot and an evening dot for each day of
 * this calendar week: ✓ done, a clock when late, empty when not read (a "+"
 * on yesterday's: a tap records it), a line for a break day.
 */
export function WeekGrid({
  grid,
  today,
  selfRecorded,
  onRecordYesterday,
  onUndo,
  onOlderDay,
}: Props) {
  const { t } = useTranslation();
  const { spacing } = useAppTheme();
  const shortNames = t('adwamuha.weekdays', { returnObjects: true }) as string[];
  const dayNames = t('adwamuha.masariHelp.dayNames', { returnObjects: true }) as string[];
  const yesterday = addDays(today, -1);
  const weekdayOf = (date: DayKey) => {
    const [y, m, d] = date.split('-').map(Number) as [number, number, number];
    return new Date(y, m - 1, d).getDay();
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.row}>
        <View style={styles.label} />
        {grid.map((day) => (
          <AppText
            key={day.date}
            variant={day.date === today ? 'label' : 'caption'}
            tone={day.date === today ? 'primary' : 'muted'}
            style={[styles.cell, day.morning === 'future' && styles.futureName]}
          >
            {day.date === today ? t('adwamuha.masari.today') : shortNames[weekdayOf(day.date)]}
          </AppText>
        ))}
      </View>
      {SESSIONS.map((session) => (
        <View key={session} style={styles.row}>
          <AppText variant="caption" tone="muted" style={styles.label}>
            {t(session === 'morning' ? 'adwamuha.masari.morningRow' : 'adwamuha.masari.eveningRow')}
          </AppText>
          {grid.map((day) => {
            const status = day[session];
            const self = selfRecorded(day.date, session);
            const isYesterday = day.date === yesterday && status === 'missed';
            const word = self
              ? t('adwamuha.masariHelp.selfRecorded')
              : isYesterday
                ? t('adwamuha.masari.legendYesterday')
                : t(`adwamuha.status.${status}`);
            const label = t('adwamuha.masariHelp.dot', {
              day: day.date === today ? t('adwamuha.masari.today') : dayNames[weekdayOf(day.date)],
              ward: t(`adwamuha.sessionName.${session}`),
              status: word,
            });
            const onPress = self
              ? () => onUndo(day.date, session)
              : isYesterday
                ? () => onRecordYesterday(session)
                : status === 'missed'
                  ? onOlderDay
                  : undefined;
            return (
              <View key={day.date} style={styles.cell}>
                <Pressable
                  accessibilityRole={onPress ? 'button' : undefined}
                  accessibilityLabel={label}
                  disabled={!onPress}
                  onPress={onPress}
                  hitSlop={6}
                >
                  <Dot status={status} plus={isYesterday} />
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
      <View style={[styles.legend, { gap: spacing.md, marginTop: spacing.xs }]}>
        {(
          [
            ['done', false, 'adwamuha.masari.legendDone'],
            ['late', false, 'adwamuha.masari.legendLate'],
            ['missed', false, 'adwamuha.masari.legendMissed'],
            ['missed', true, 'adwamuha.masari.legendYesterday'],
          ] as const
        ).map(([status, plus, key]) => (
          <View key={key} style={[styles.row, { gap: spacing.xs }]}>
            <Dot status={status} plus={plus} small />
            <AppText variant="caption" tone="muted">
              {t(key)}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

function Dot({ status, plus, small }: { status: DayStatus; plus: boolean; small?: boolean }) {
  const { colors } = useAppTheme();
  const size = small ? 16 : DOT;
  const base = {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
  const icon = small ? 10 : 15;
  switch (status) {
    case 'done':
      return (
        <View style={[base, { backgroundColor: colors.primary }]}>
          <Icon name="check" size={icon} color={colors.onPrimary} />
        </View>
      );
    case 'late':
      return (
        <View style={[base, { backgroundColor: colors.accent }]}>
          <Icon name="clock" size={icon} color={colors.onPrimary} />
        </View>
      );
    case 'missed':
      return (
        <View
          style={[base, { borderWidth: 2, borderColor: plus ? colors.primary : colors.border }]}
        >
          {plus ? <Icon name="plus" size={icon} color={colors.primary} /> : null}
        </View>
      );
    case 'open':
      return (
        <View
          style={[base, { borderWidth: 2, borderColor: colors.primary, borderStyle: 'dashed' }]}
        />
      );
    case 'paused':
      return (
        <View style={base}>
          <View style={[styles.pause, { backgroundColor: colors.border }]} />
        </View>
      );
    case 'future':
      // The days still to come (design `.dot.fut`): dashed and faded.
      return (
        <View
          style={[
            base,
            styles.future,
            { borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed' },
          ]}
        />
      );
    default:
      return <View style={base} />;
  }
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { width: 40 },
  cell: { flex: 1, alignItems: 'center', textAlign: 'center' },
  pause: { width: 16, height: 4, borderRadius: 2 },
  future: { opacity: 0.45 },
  futureName: { opacity: 0.5 },
  legend: { flexDirection: 'row', flexWrap: 'wrap' },
});
