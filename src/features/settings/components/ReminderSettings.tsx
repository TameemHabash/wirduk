import { Linking, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { IconTile } from '@/components/ui/IconTile';
import { useToast } from '@/components/ui/Toast';
import type { ReminderSetting } from '@/data/settings/settings';
import { useSettings } from '@/data/settings/SettingsProvider';
import { displayTime } from '@/lib/time';
import { openTimePicker } from '@/lib/time-picker';
import { NotificationsDeniedCard } from '@/features/reminders/components/NotificationsDeniedCard';
import { type ReminderKind, ensurePermission } from '@/features/reminders/services/reminders';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { RowDivider, SettingsGroup } from '@/components/ui/SettingsRows';

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
    <View style={{ gap: spacing.sm }}>
      <SettingsGroup
        title={title ?? t('settings.reminders')}
        // While notifications are not allowed: a lasting card (owner, 2026-11-25).
        before={<NotificationsDeniedCard />}
      >
        <ReminderRow kind="morning" name={names?.morning} />
        <RowDivider />
        <ReminderRow kind="evening" name={names?.evening} />
      </SettingsGroup>
      <AppText variant="caption" tone="muted" style={{ paddingHorizontal: spacing.xs + 2 }}>
        {t('settings.remindersHint')}
      </AppText>
    </View>
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
      icon: 'bell',
      tone: 'gold',
      onPress: () => void Linking.openSettings(),
    });
  };

  const pickTime = () => openTimePicker(reminder.time, (time) => save({ ...reminder, time }));

  return (
    <View
      style={[
        styles.row,
        { paddingHorizontal: spacing.lg - 2, gap: spacing.md, paddingVertical: 4 },
      ]}
    >
      <IconTile
        icon={kind === 'morning' ? 'sun' : 'moon'}
        tone={kind === 'morning' ? 'gold' : 'primary'}
      />
      <AppText style={styles.label}>{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('settings.changeTime', { name: label, time })}
        onPress={pickTime}
        hitSlop={6}
        style={({ pressed }) => [
          styles.time,
          { backgroundColor: colors.surfaceMuted },
          pressed && { opacity: 0.6 },
        ]}
      >
        <AppText key={time} roomy style={styles.timeText}>
          {time}
        </AppText>
      </Pressable>
      <Switch
        value={reminder.enabled}
        onValueChange={(v) => void onToggle(v)}
        accessibilityLabel={label}
        trackColor={{ false: colors.borderStrong, true: colors.primary }}
        thumbColor={colors.knob}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 60 },
  label: { flex: 1 },
  time: { borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
  timeText: { fontFamily: UI_FONTS.semibold, fontSize: 15, lineHeight: 22 },
});
