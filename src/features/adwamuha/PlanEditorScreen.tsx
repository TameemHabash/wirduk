import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useDialog } from '@/components/Dialog';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { SortableList } from '@/components/SortableList';
import { useToast } from '@/components/Toast';
import { useRepositories } from '@/data/DataProvider';
import { useAppTheme } from '@/theme/ThemeProvider';

import { useAdwamuha } from './AdwamuhaProvider';
import { HadithCard } from './HadithCard';
import {
  MAX_STEP_WEEKS,
  MIN_STEP_WEEKS,
  canMove,
  canPass,
  reorderOthers,
  restoreDefault,
  samePlan,
  stepKey,
  withPassed,
} from './logic/plan-edit';
import type { UserPlan, UserPlanStep } from './logic/types';
import { copyDefaultPlan } from './logic/ward';
import { OWNER_TEXTS } from './owner-texts';
import { stepLabel, stepSession } from './setup';
import { useDhikrTexts } from './useDhikrTexts';

/**
 * «عدّل الخطة» (prompt §4.3; owner): later steps can be reordered, each step's
 * weeks changed (1–8), «استعادة الخطة الافتراضية», and «قطعتها» on the current
 * step or a later one: a step the user already keeps joins the steps done
 * (owner, 2026-11-22). Saving a change away from the default plan first shows
 * the light-plan notice with the hadith. The steps show by their first words,
 * or the owner's names (as in «ترتيب الورد»).
 */
export function PlanEditorScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const dialog = useDialog();
  const { colors, radii, spacing } = useAppTheme();
  const { content } = useRepositories();
  const { stored, savePlan } = useAdwamuha();
  /** The current step as saved. */
  const saved = stored?.state.step ?? 1;

  // The user's changes to the order and weeks; until the first one, their saved plan (it
  // may still be loading).
  const [edited, setEdited] = useState<UserPlan | null>(null);
  const base = edited ?? stored?.plan ?? null;
  // The steps marked «قطعتها» here, in the order marked (applied when saved).
  const [passed, setPassed] = useState<string[]>([]);
  const [defaultPlan, setDefaultPlan] = useState<UserPlan | null>(null);
  const texts = useDhikrTexts();
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    content
      .getDefaultPlan(i18n.language)
      .then((plan) => {
        if (!cancelled) setDefaultPlan(copyDefaultPlan(plan));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [content, i18n.language]);

  // The plan as it would be saved: the marked steps right after the steps done.
  const draft = useMemo(
    () => (base ? withPassed(base, saved, passed) : null),
    [base, saved, passed],
  );
  const dirty = Boolean(draft && stored && (passed.length > 0 || !samePlan(draft, stored.plan)));
  if (!draft || !base || !stored)
    return <View style={[styles.fill, { backgroundColor: colors.background }]} />;

  /** The current step once saved. */
  const current = saved + passed.length;
  const mayPass = !stored.state.maintenance && canPass(draft, saved, passed.length);

  const save = async () => {
    await savePlan(draft, passed.length);
    toast.show({ message: t('adwamuha.plan.saved'), icon: 'check', tone: 'gold' });
    router.back();
  };
  const onSave = () => {
    // Back to the default plan needs no warning; any other change does.
    const backToDefault =
      defaultPlan &&
      passed.length === 0 &&
      samePlan(draft, restoreDefault(stored.plan, saved, defaultPlan));
    if (backToDefault) {
      void save();
      return;
    }
    // The light-plan notice with the hadith: keeping the plan is the main button, saving
    // the quietest (owner, 2026-11-25: lead the user to the plan).
    dialog.show({
      icon: 'sprout',
      tone: 'gold',
      title: t('adwamuha.plan.confirmTitle'),
      body: t('adwamuha.plan.confirmBody'),
      content: <HadithCard />,
      actions: [
        { label: t('adwamuha.plan.confirmKeep'), cancel: true },
        { label: t('adwamuha.plan.confirmSave'), kind: 'plain', onPress: () => void save() },
      ],
    });
  };
  const reset = () =>
    dialog.show({
      icon: 'reset',
      title: OWNER_TEXTS.labels.resetPlan,
      body: t('adwamuha.plan.resetBody'),
      actions: [
        {
          label: OWNER_TEXTS.labels.resetPlan,
          onPress: () => {
            if (!defaultPlan) return;
            setEdited(restoreDefault(stored.plan, saved, defaultPlan));
            setPassed([]);
          },
        },
        { label: t('common.cancel'), cancel: true },
      ],
    });
  const setWeeks = (step: UserPlanStep, weeks: number) =>
    setEdited({
      ...base,
      steps: base.steps.map((s) => (stepKey(s) === stepKey(step) ? { ...s, weeks } : s)),
    });
  const pass = (s: UserPlanStep) => setPassed([...passed, stepKey(s)]);
  const unpass = (s: UserPlanStep) => setPassed(passed.filter((k) => k !== stepKey(s)));

  const describe = (s: UserPlanStep) => ({
    session: t(`adwamuha.plan.${stepSession(s)}`),
    words: stepLabel(s, texts),
  });
  const positionOf = (s: UserPlanStep) =>
    draft.steps.findIndex((x) => stepKey(x) === stepKey(s)) + 1;

  if (reordering) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={[styles.fill, { backgroundColor: colors.background }]}
      >
        <SortableList
          items={draft.steps}
          keyOf={stepKey}
          title={t('adwamuha.plan.reorder')}
          hint={t('adwamuha.plan.reorderHint')}
          dragLabel={(s) => t('adwamuha.plan.drag', { step: positionOf(s) })}
          canDrag={(s) => canMove(positionOf(s), current, draft)}
          canDrop={(from, to) =>
            canMove(from + 1, current, draft) && canMove(to + 1, current, draft)
          }
          onReorder={(steps) =>
            setEdited(reorderOthers(base, saved, passed, steps.slice(current - 1)))
          }
          onDone={() => setReordering(false)}
          renderItem={(s) => {
            const { session, words } = describe(s);
            return (
              <View style={{ paddingVertical: spacing.sm }}>
                <AppText variant="bodyStrong">{`${session} · ${words}`}</AppText>
              </View>
            );
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.fill, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <AppText tone="muted">
          {t('adwamuha.plan.intro', { passed: OWNER_TEXTS.labels.stepPassed })}
        </AppText>
        {draft.steps.map((s, i) => {
          const position = i + 1;
          const { session, words } = describe(s);
          const editable = position >= current;
          // Marked «قطعتها» here, not saved yet: it can be undone.
          const marked = position >= saved && position < current;
          return (
            <View
              key={stepKey(s)}
              style={{
                backgroundColor: colors.surface,
                borderColor: position === current ? colors.accent : colors.border,
                borderWidth: 1,
                borderRadius: radii.md,
                padding: spacing.md,
                gap: spacing.xs,
              }}
            >
              <View style={[styles.row, { gap: spacing.sm }]}>
                <AppText variant="bodyStrong" style={styles.fill}>
                  {t('adwamuha.plan.step', { step: position })}
                </AppText>
                <AppText variant="caption" tone={position === current ? 'accent' : 'muted'}>
                  {position < current
                    ? t('adwamuha.plan.done')
                    : position === current
                      ? t('adwamuha.plan.current')
                      : session}
                </AppText>
              </View>
              <AppText tone="muted">{words}</AppText>
              <View style={[styles.row, { gap: spacing.sm }]}>
                <AppText style={styles.fill}>
                  {t('adwamuha.plan.weeks', { count: s.weeks })}
                </AppText>
                {editable ? (
                  <>
                    <IconButton
                      icon="minus"
                      label={t('adwamuha.plan.fewerWeeks', { step: position })}
                      onPress={() => setWeeks(s, s.weeks - 1)}
                      disabled={s.weeks <= MIN_STEP_WEEKS}
                    />
                    <IconButton
                      icon="plus"
                      label={t('adwamuha.plan.moreWeeks', { step: position })}
                      onPress={() => setWeeks(s, s.weeks + 1)}
                      disabled={s.weeks >= MAX_STEP_WEEKS}
                    />
                  </>
                ) : null}
              </View>
              {marked ? (
                <CardLink
                  icon="reset"
                  title={t('adwamuha.plan.unpass')}
                  label={t('adwamuha.plan.unpassLabel', { step: position })}
                  onPress={() => unpass(s)}
                />
              ) : editable && mayPass ? (
                <CardLink
                  icon="check"
                  title={OWNER_TEXTS.labels.stepPassed}
                  label={t('adwamuha.plan.passLabel', {
                    step: position,
                    passed: OWNER_TEXTS.labels.stepPassed,
                  })}
                  onPress={() => pass(s)}
                />
              ) : null}
            </View>
          );
        })}
        <Button
          title={t('adwamuha.plan.reorder')}
          kind="secondary"
          onPress={() => setReordering(true)}
          disabled={current >= draft.steps.length - 1}
        />
        <Button title={OWNER_TEXTS.labels.resetPlan} kind="secondary" onPress={reset} />
        <Button title={t('adwamuha.plan.save')} onPress={onSave} disabled={!dirty} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** A small text button at the bottom of a step's card («قطعتها», «تراجع»). */
function CardLink({
  icon,
  title,
  label,
  onPress,
}: {
  icon: 'check' | 'reset';
  title: string;
  label: string;
  onPress: () => void;
}) {
  const { colors, spacing } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.row,
        styles.link,
        { gap: spacing.xs, borderTopColor: colors.border },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Icon name={icon} size={18} color={colors.primary} />
      <AppText variant="label" tone="primary">
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  // The step's own action, under a thin line (a touch target of 44).
  link: { minHeight: 44, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 4 },
});
