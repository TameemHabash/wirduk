import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { useSettings } from '@/data/settings/SettingsProvider';
import { autoBackupKnown, lastAutoBackupAt } from '@/features/backup/auto-backup';
import { AutoBackupStatus } from '@/features/backup/AutoBackupStatus';
import { displayTime, formatTime, parseTime } from '@/features/reminders/reminder-time';
import { ReminderSettings } from '@/features/settings/ReminderSettings';
import { RowDivider, SettingsGroup, ToggleRow } from '@/features/settings/SettingsParts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { useAdwamuha } from './AdwamuhaProvider';
import { type WardTimes, validWardTimes } from './logic/sessions';
import { OWNER_TEXTS } from './owner-texts';
import { StepBackSheet } from './StepBackSheet';
import { WardOrderPicker } from './WardOrderPicker';

/**
 * «أدومها»'s own settings (the owner's design): on/off, the reminders (they
 * live here while it is on), the ward times, the week's first day, the plan,
 * «ترتيب الورد» with a preview of the ward, and keeping the path safe
 * (Android's backup).
 */
export function AdwamuhaSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { colors, spacing } = useAppTheme();
  const { enabled, stored, turnOff, resume } = useAdwamuha();
  const [stepBackOpen, setStepBackOpen] = useState(false);
  const [autoBackupAt] = useState(lastAutoBackupAt);

  const onToggle = (on: boolean) => {
    if (!on) {
      void turnOff().then(() => toast.show({ message: t('adwamuha.settingsScreen.offNote') }));
      return;
    }
    if (!stored) {
      // The first time: the whole setup (what it is, where to start, the reminders).
      router.push('/adwamuha/intro');
      return;
    }
    // Turned on again: continue, or start over (the history stays either way).
    Alert.alert(t('adwamuha.continue.title'), t('adwamuha.continue.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('adwamuha.continue.restart'), onPress: () => router.push('/adwamuha/start') },
      { text: t('adwamuha.continue.continue'), onPress: () => void resume() },
    ]);
  };

  return (
    <SafeAreaView edges={['bottom']} style={[styles.fill, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
        <SettingsGroup title={OWNER_TEXTS.featureName} highlight>
          <ToggleRow
            label={t('adwamuha.settingsScreen.enabled')}
            hint={t('adwamuha.settingsScreen.enabledNote')}
            value={enabled}
            onChange={onToggle}
          />
        </SettingsGroup>
        {enabled ? (
          <>
            <ReminderSettings
              title={t('adwamuha.settingsScreen.remindersTitle')}
              names={{
                morning: t('adwamuha.wardTitle.morning'),
                evening: t('adwamuha.wardTitle.evening'),
              }}
            />
            <WardTimesSettings />
            <WeekStartSettings />
            <SettingsGroup title={t('adwamuha.settingsScreen.planTitle')}>
              <NoteRow
                label={OWNER_TEXTS.labels.editPlan}
                note={t('adwamuha.settingsScreen.editPlanNote')}
                onPress={() => router.push('/adwamuha/plan')}
              />
              <RowDivider />
              <NoteRow
                label={OWNER_TEXTS.labels.lifeChange}
                note={t('adwamuha.settingsScreen.lifeChangeNote')}
                onPress={() => setStepBackOpen(true)}
              />
            </SettingsGroup>
            {/* Under «الخطة», above «احفظ مسارك» (owner, 2026-10-30). */}
            <WardOrderSettings />
          </>
        ) : null}
        {autoBackupKnown ? (
          <SettingsGroup title={t('adwamuha.settingsScreen.backupTitle')}>
            <View style={{ padding: spacing.lg, gap: spacing.md }}>
              <AppText tone="muted">{t('backup.start.text')}</AppText>
              <AutoBackupStatus
                at={autoBackupAt}
                always
                buttonTitle={t('adwamuha.settingsScreen.openBackup')}
              />
            </View>
          </SettingsGroup>
        ) : null}
      </ScrollView>
      <StepBackSheet visible={stepBackOpen} onClose={() => setStepBackOpen(false)} />
    </SafeAreaView>
  );
}

/** A row with a second line and a chevron (design). */
function NoteRow({ label, note, onPress }: { label: string; note: string; onPress: () => void }) {
  const { colors, spacing } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${note}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { paddingHorizontal: spacing.lg, gap: spacing.md, paddingVertical: spacing.sm },
        pressed && { backgroundColor: colors.surfaceMuted },
      ]}
    >
      <View style={styles.fill}>
        <AppText>{label}</AppText>
        <AppText variant="caption" tone="muted">
          {note}
        </AppText>
      </View>
      <Icon name="forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

/** «ترتيب الورد» for the user's morning ward, its first four shown first (owner, 2026-10-30). */
function WardOrderSettings() {
  const { t } = useTranslation();
  const { spacing } = useAppTheme();
  const { settings, update } = useSettings();
  const { wardIds } = useAdwamuha();
  return (
    <SettingsGroup title={t('adwamuha.settingsScreen.orderTitle')}>
      <View style={{ padding: spacing.lg }}>
        <WardOrderPicker
          order={settings.wardOrder}
          onChange={(order) => void update('wardOrder', order)}
          wardIds={wardIds('morning')}
          showAllFirst={false}
        />
      </View>
    </SettingsGroup>
  );
}

/** «أوقات الورد» (design): for each ward, when it starts and until when it is on time. */
function WardTimesSettings() {
  const { t } = useTranslation();
  const { spacing } = useAppTheme();
  const { settings, update } = useSettings();
  const toast = useToast();
  const times = settings.wardTimes;

  const pick = (key: keyof WardTimes) => {
    const { hour, minute } = parseTime(times[key]);
    const value = new Date();
    value.setHours(hour, minute, 0, 0);
    DateTimePickerAndroid.open({
      mode: 'time',
      value,
      is24Hour: false,
      onValueChange: (_event, date) => {
        const next = { ...times, [key]: formatTime(date.getHours(), date.getMinutes()) };
        if (validWardTimes(next)) void update('wardTimes', next);
        else toast.show({ message: t('adwamuha.settings.badTimes') });
      },
    });
  };

  const rows = [
    ['morningTimes', 'morningTimesNote', 'morningStart', 'morningOnTimeEnd'],
    ['eveningTimes', 'eveningTimesNote', 'eveningStart', 'eveningOnTimeEnd'],
  ] as const;

  return (
    <SettingsGroup title={t('adwamuha.settingsScreen.timesTitle')}>
      {rows.map(([name, note, start, end], i) => (
        <View key={name}>
          {i > 0 ? <RowDivider /> : null}
          <View
            style={[
              styles.row,
              { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
            ]}
          >
            <View style={styles.fill}>
              <AppText>{t(`adwamuha.settingsScreen.${name}`)}</AppText>
              <AppText variant="caption" tone="muted">
                {t(`adwamuha.settingsScreen.${note}`)}
              </AppText>
            </View>
            {([start, end] as const).map((key, j) => {
              const label = t(`adwamuha.settings.${key}`);
              const time = displayTime(times[key], t('settings.am'), t('settings.pm'));
              return (
                <View key={key} style={[styles.row, { gap: spacing.xs }]}>
                  {j > 0 ? (
                    <AppText tone="muted" importantForAccessibility="no">
                      –
                    </AppText>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('adwamuha.settings.changeTime', { name: label, time })}
                    onPress={() => pick(key)}
                    hitSlop={8}
                    style={styles.time}
                  >
                    <AppText variant="label" tone="primary">
                      {time}
                    </AppText>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </SettingsGroup>
  );
}

/** The days a week can start on (design, 2026-10-30), in the design's order. */
const WEEK_START_CHOICES = [
  [5, 'adwamuha.settingsScreen.weekStartFriday'],
  [6, 'adwamuha.settingsScreen.weekStartSaturday'],
  [0, 'adwamuha.settingsScreen.weekStartSunday'],
  [1, 'adwamuha.settingsScreen.weekStartMonday'],
] as const;

/**
 * «بداية الأسبوع» (design, 2026-10-30): four days (Saturday by default, with no
 * mark), a live preview of the week with its first day marked, and a hint. The
 * only source of the week's first day; a change applies at once (the numbers
 * are worked out from the stored days, so nothing is lost).
 */
function WeekStartSettings() {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useAppTheme();
  const { weekStart: start, setWeekStart } = useAdwamuha();
  const shortNames = t('adwamuha.weekdays', { returnObjects: true }) as string[];
  const title = t('adwamuha.settingsScreen.weekStartTitle');
  return (
    <SettingsGroup title={title}>
      <View style={{ padding: spacing.md, gap: spacing.md }}>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={title}
          style={[
            styles.weekChoices,
            { backgroundColor: colors.surfaceMuted, borderRadius: radii.md },
          ]}
        >
          {WEEK_START_CHOICES.map(([day, name]) => {
            const on = day === start;
            return (
              <Pressable
                key={day}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => void setWeekStart(day)}
                style={({ pressed }) => [
                  styles.weekChoice,
                  { backgroundColor: on ? colors.primary : 'transparent' },
                  pressed && !on && { opacity: 0.6 },
                ]}
              >
                <AppText
                  variant={on ? 'bodyStrong' : 'body'}
                  style={[styles.centerText, { color: on ? colors.onPrimary : colors.textMuted }]}
                >
                  {t(name)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.weekPreview, { gap: 4 }]}
        >
          {Array.from({ length: 7 }, (_, k) => {
            const day = (start + k) % 7;
            const first = k === 0;
            return (
              <View
                key={day}
                testID={first ? 'week-first-day' : undefined}
                style={[
                  styles.previewDay,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: first ? colors.primary : colors.surfaceMuted,
                  },
                  k === 6 && styles.lastDay,
                ]}
              >
                <AppText
                  variant="label"
                  tone={first ? 'primary' : 'muted'}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={styles.centerText}
                >
                  {shortNames[day]}
                </AppText>
              </View>
            );
          })}
        </View>
        <AppText variant="caption" tone="muted">
          {t('adwamuha.settingsScreen.weekStartHint')}
        </AppText>
      </View>
    </SettingsGroup>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  time: { minHeight: 44, justifyContent: 'center' },
  centerText: { alignSelf: 'stretch', textAlign: 'center' },
  weekChoices: { flexDirection: 'row', padding: 4, gap: 4 },
  weekChoice: {
    flex: 1,
    minHeight: 54,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  weekPreview: { flexDirection: 'row' },
  previewDay: { flex: 1, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5 },
  lastDay: { opacity: 0.7 },
});
