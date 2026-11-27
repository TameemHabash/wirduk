import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { useSettings } from '@/data/settings/SettingsProvider';
import { displayTime } from '@/lib/time';
import { openTimePicker } from '@/lib/time-picker';
import { ensurePermission } from '@/features/reminders/services/reminders';
import { useAppTheme } from '@/theme/ThemeProvider';

import { useAdwamuha } from '@/features/adwamuha/state/AdwamuhaProvider';
import { SetupLayout } from '@/features/adwamuha/components/SetupParts';
import { type Session, SESSIONS } from '@/data/models';

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
      if (wanted && !settings.notificationsAsked) await update('notificationsAsked', true);
      for (const s of SESSIONS) {
        await update(SETTING_KEY[s], { enabled: on[s] && allowed, time: timeOf(s) });
      }
      if (!allowed) {
        toast.show({
          message: t('settings.notificationsDenied'),
          icon: 'bell',
          tone: 'gold',
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

  const pickTime = () => openTimePicker(time, onTime);

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
