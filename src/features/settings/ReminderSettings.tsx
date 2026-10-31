import { Linking, Pressable, StyleSheet, Switch, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { useToast } from '@/components/Toast';
import type { ReminderSetting } from '@/data/settings/settings';
import { useSettings } from '@/data/settings/SettingsProvider';
import { displayTime, formatTime, parseTime } from '@/features/reminders/reminder-time';
import { type ReminderKind, ensurePermission } from '@/features/reminders/reminders';
import { useAppTheme } from '@/theme/ThemeProvider';

import { RowDivider, SettingsGroup } from './SettingsParts';

const SETTING_KEY = { morning: 'morningReminder', evening: 'eveningReminder' } as const;

/**
 * Morning and evening reminders: each with its own switch and time. Both off by default.
 * «أدومها»'s settings show the same two under their own title and names (design).
 */
export function ReminderSettings({
  title,
  names,
}: {
  title?: string;
  names?: Record<ReminderKind, string>;
} = {}) {
  const { t } = useTranslation();
  const { spacing } = useAppTheme();
  return (
    <SettingsGroup title={title ?? t('settings.reminders')}>
      <ReminderRow kind="morning" name={names?.morning} />
      <RowDivider />
      <ReminderRow kind="evening" name={names?.evening} />
      <RowDivider />
      <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
        <AppText variant="caption" tone="muted">
          {t('settings.remindersHint')}
        </AppText>
      </View>
    </SettingsGroup>
  );
}

function ReminderRow({ kind, name }: { kind: ReminderKind; name?: string }) {
  const { t } = useTranslation();
  const { colors, spacing } = useAppTheme();
  const { settings, update } = useSettings();
  const toast = useToast();
  const key = SETTING_KEY[kind];
  const reminder = settings[key];
  const label = name ?? t(`settings.${kind}Reminder`);
  const time = displayTime(reminder.time, t('settings.am'), t('settings.pm'));

  const save = (next: ReminderSetting) => void update(key, next);

  const onToggle = async (enabled: boolean) => {
    if (!enabled) return save({ ...reminder, enabled });
    const allowed = await ensurePermission(t('reminders.channel')).catch(() => false);
    if (allowed) return save({ ...reminder, enabled });
    toast.show({
      message: t('settings.notificationsDenied'),
      onPress: () => void Linking.openSettings(),
    });
  };

  const pickTime = () => {
    const { hour, minute } = parseTime(reminder.time);
    const value = new Date();
    value.setHours(hour, minute, 0, 0);
    DateTimePickerAndroid.open({
      mode: 'time',
      value,
      is24Hour: false,
      onValueChange: (_event, date) =>
        save({ ...reminder, time: formatTime(date.getHours(), date.getMinutes()) }),
    });
  };

  return (
    <View
      style={[styles.row, { paddingHorizontal: spacing.lg, gap: spacing.md, paddingVertical: 4 }]}
    >
      <View style={styles.label}>
        <AppText>{label}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.changeTime', { name: label, time })}
          onPress={pickTime}
          hitSlop={8}
          style={({ pressed }) => [styles.time, pressed && { opacity: 0.6 }]}
        >
          <AppText variant="label" tone="primary">
            {time}
          </AppText>
        </Pressable>
      </View>
      <Switch
        value={reminder.enabled}
        onValueChange={(v) => void onToggle(v)}
        accessibilityLabel={label}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 64 },
  label: { flex: 1, alignItems: 'flex-start' },
  time: { paddingVertical: 4 },
});
