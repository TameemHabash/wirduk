import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { useSettings } from '@/data/settings/SettingsProvider';
import { displayTime, formatTime, parseTime } from '@/features/reminders/reminder-time';
import { ensurePermission } from '@/features/reminders/reminders';
import { useAppTheme } from '@/theme/ThemeProvider';

import { useAdwamuha } from './AdwamuhaProvider';
import { SESSIONS, type Session } from './logic/sessions';
import { SetupLayout } from './SetupParts';

const SETTING_KEY = { morning: 'morningReminder', evening: 'eveningReminder' } as const;

/**
 * Setup 4 of 4 (design): the app's two reminders (the same stored values, no
 * new ones), on here because the user chose to turn «أدومها» on; they can turn
 * them off. «ابدأ مساري» asks Android for notifications (only if one is on),
 * starts the plan and opens Home, where a welcome waits.
 */
export function SetupRemindersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { settings, update } = useSettings();
  const { start } = useAdwamuha();
  const params = useLocalSearchParams<{ step?: string }>();
  const step = Math.max(1, Math.floor(Number(params.step)) || 1);
  const [on, setOn] = useState<Record<Session, boolean>>({ morning: true, evening: true });
  const [times, setTimes] = useState<Partial<Record<Session, string>>>({});
  const [busy, setBusy] = useState(false);
  const timeOf = (s: Session) => times[s] ?? settings[SETTING_KEY[s]].time;

  const go = async () => {
    setBusy(true);
    try {
      const wanted = on.morning || on.evening;
      const allowed = wanted
        ? await ensurePermission(t('reminders.channel')).catch(() => false)
        : true;
      for (const s of SESSIONS) {
        await update(SETTING_KEY[s], { enabled: on[s] && allowed, time: timeOf(s) });
      }
      if (!allowed) {
        toast.show({
          message: t('settings.notificationsDenied'),
          onPress: () => void Linking.openSettings(),
        });
      }
      await start(step);
      router.dismissTo('/');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SetupLayout
      page={3}
      actions={<Button title={t('adwamuha.setup.go')} disabled={busy} onPress={() => void go()} />}
    >
      <AppText tone="muted">{t('adwamuha.setup.remindersIntro')}</AppText>
      {SESSIONS.map((s) => (
        <ReminderChoice
          key={s}
          session={s}
          time={timeOf(s)}
          enabled={on[s]}
          onToggle={(value) => setOn((o) => ({ ...o, [s]: value }))}
          onTime={(time) => setTimes((x) => ({ ...x, [s]: time }))}
        />
      ))}
      <AppText variant="caption" tone="muted">
        {t('adwamuha.setup.remindersHint')}
      </AppText>
    </SetupLayout>
  );
}

function ReminderChoice({
  session,
  time,
  enabled,
  onToggle,
  onTime,
}: {
  session: Session;
  time: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
  onTime: (time: string) => void;
}) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useAppTheme();
  const name = t(`adwamuha.wardTitle.${session}`);
  const shown = displayTime(time, t('settings.am'), t('settings.pm'));

  const pickTime = () => {
    const { hour, minute } = parseTime(time);
    const value = new Date();
    value.setHours(hour, minute, 0, 0);
    DateTimePickerAndroid.open({
      mode: 'time',
      value,
      is24Hour: false,
      onValueChange: (_event, date) => onTime(formatTime(date.getHours(), date.getMinutes())),
    });
  };

  return (
    <View
      style={[
        styles.row,
        {
          gap: spacing.md,
          padding: spacing.lg,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
      ]}
    >
      <Icon
        name={session === 'morning' ? 'sun' : 'moon'}
        size={24}
        color={session === 'morning' ? colors.accent : colors.primary}
      />
      <View style={styles.fill}>
        <AppText variant="bodyStrong">{name}</AppText>
        <AppText variant="caption" tone="muted">
          {t('adwamuha.setup.daily')}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('settings.changeTime', { name, time: shown })}
        onPress={pickTime}
        hitSlop={8}
        style={({ pressed }) => [{ paddingVertical: 4 }, pressed && { opacity: 0.6 }]}
      >
        <AppText variant="label" tone="primary">
          {shown}
        </AppText>
      </Pressable>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        accessibilityLabel={name}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
