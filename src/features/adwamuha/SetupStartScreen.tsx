import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { DhikrText } from '@/components/DhikrText';
import { Button } from '@/components/Button';
import { APP_CONFIG } from '@/config/app-config';
import { useRepositories } from '@/data/DataProvider';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

import type { UserPlan } from './logic/types';
import { copyDefaultPlan, wardDhikrIds } from './logic/ward';
import { OWNER_TEXTS } from './owner-texts';
import { dhikrLabel, stepLabel } from './setup';
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
          {/* The step in the middle, between + and − (owner, 2026-11-25), its words under it. */}
          <View style={[styles.row, styles.stepper, { backgroundColor: colors.surfaceMuted }]}>
            <StepperButton
              icon="plus"
              label={t('adwamuha.start.more')}
              onPress={() => setStep((s) => Math.min(total, s + 1))}
              disabled={step >= total}
            />
            <View style={styles.mid} accessibilityLiveRegion="polite">
              <AppText style={styles.stepText}>
                {OWNER_TEXTS.labels.stepOf
                  .replace('{{step}}', String(step))
                  .replace('{{total}}', String(total))}
              </AppText>
              {plan?.steps[step - 1] ? (
                <DhikrText
                  size={15}
                  numberOfLines={2}
                  style={[styles.center, { color: colors.textMuted }]}
                >
                  {stepLabel(plan.steps[step - 1]!, texts)}
                </DhikrText>
              ) : null}
            </View>
            <StepperButton
              icon="minus"
              label={t('adwamuha.start.fewer')}
              onPress={() => setStep((s) => Math.max(2, s - 1))}
              disabled={step <= 2}
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
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 2,
                }}
              >
                <DhikrText size={15}>{words}</DhikrText>
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

/** A + or − in the step picker (design `.stepper .sb`). */
function StepperButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: 'plus' | 'minus';
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.stepButton, { backgroundColor: colors.surface }, disabled && { opacity: 0.4 }]}
    >
      <Icon name={icon} size={18} color={colors.primaryInk} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  stepper: { gap: 8, borderRadius: 14, padding: 5 },
  stepButton: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mid: { flex: 1, alignItems: 'center' },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  stepText: { fontFamily: UI_FONTS.semibold, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
});
