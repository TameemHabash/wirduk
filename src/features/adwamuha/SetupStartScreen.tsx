import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { APP_CONFIG } from '@/config/app-config';
import { useRepositories } from '@/data/DataProvider';
import { useAppTheme } from '@/theme/ThemeProvider';

import type { UserPlan } from './logic/types';
import { copyDefaultPlan, wardDhikrIds } from './logic/ward';
import { OWNER_TEXTS } from './owner-texts';
import { dhikrLabel } from './setup';
import { ChoiceCard, SetupLayout } from './SetupParts';

/**
 * Setup 2 of 4 (design): start at step 1, or — for someone who already keeps
 * some of the adhkar — at a later step (2 weeks on it, not its full time),
 * with every dhikr of that step's ward: its first words (from the database)
 * or the owner's name for it (owner, 2026-10-30: all of them, so the user
 * knows what the step holds).
 */
export function SetupStartScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors, radii, spacing } = useAppTheme();
  const { content } = useRepositories();
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [texts, setTexts] = useState(new Map<number, string>());
  const [some, setSome] = useState(false);
  const [step, setStep] = useState(2);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      content.getDefaultPlan(i18n.language),
      content.listAdhkar(APP_CONFIG.content.morningCategoryId, i18n.language),
    ])
      .then(([p, adhkar]) => {
        if (cancelled) return;
        setPlan(copyDefaultPlan(p));
        setTexts(new Map(adhkar.map((d) => [d.id, d.text])));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [content, i18n.language]);

  const total = plan?.steps.length ?? 24;
  const chosen = some ? step : 1;
  const preview = plan
    ? wardDhikrIds(plan, chosen, 'morning').map((id) => dhikrLabel(id, texts.get(id) ?? ''))
    : [];

  return (
    <SetupLayout
      page={1}
      actions={
        <Button
          title={t('adwamuha.setup.next')}
          disabled={!plan}
          onPress={() =>
            router.push({ pathname: '/adwamuha/order', params: { step: String(chosen) } })
          }
        />
      }
    >
      <AppText tone="muted">{t('adwamuha.setup.startIntro')}</AppText>
      <ChoiceCard
        title={t('adwamuha.setup.fromFirst')}
        note={t('adwamuha.setup.fromFirstNote')}
        selected={!some}
        onPress={() => setSome(false)}
      />
      <ChoiceCard
        title={t('adwamuha.setup.fromSome')}
        note={t('adwamuha.setup.fromSomeNote')}
        selected={some}
        onPress={() => setSome(true)}
      />
      {some ? (
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radii.lg,
            padding: spacing.lg,
            gap: spacing.md,
          }}
        >
          <View style={[styles.row, { gap: spacing.md }]}>
            <IconButton
              icon="minus"
              label={t('adwamuha.start.fewer')}
              onPress={() => setStep((s) => Math.max(2, s - 1))}
              disabled={step <= 2}
            />
            <AppText variant="heading" style={styles.stepText} accessibilityLiveRegion="polite">
              {OWNER_TEXTS.labels.stepOf
                .replace('{{step}}', String(step))
                .replace('{{total}}', String(total))}
            </AppText>
            <IconButton
              icon="plus"
              label={t('adwamuha.start.more')}
              onPress={() => setStep((s) => Math.min(total, s + 1))}
              disabled={step >= total}
            />
          </View>
          <View
            accessible
            accessibilityLabel={t('adwamuha.setupHelp.preview', { list: preview.join('، ') })}
            style={[styles.chips, { gap: spacing.sm }]}
          >
            {preview.map((words, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: radii.md,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                }}
              >
                <AppText variant="caption">{words}</AppText>
              </View>
            ))}
          </View>
          <AppText variant="caption" tone="accent">
            {t('adwamuha.setup.stepNote')}
          </AppText>
        </View>
      ) : null}
    </SetupLayout>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  stepText: { flex: 1, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
});
