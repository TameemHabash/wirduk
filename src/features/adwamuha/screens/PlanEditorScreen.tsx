import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { DhikrText } from '@/components/ui/DhikrText';
import { useDialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { IconTile } from '@/components/ui/IconTile';
import { SortableList } from '@/components/ui/SortableList';
import { TextButton } from '@/components/ui/TextButton';
import { useToast } from '@/components/ui/Toast';
import { useRepositories } from '@/data/DataProvider';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { useAdwamuha } from '@/features/adwamuha/state/AdwamuhaProvider';
import { HadithCard } from '@/features/adwamuha/components/HadithCard';
import {
  MAX_STEP_WEEKS,
  MIN_STEP_WEEKS,
  canMove,
  editedCurrent,
  reorderOthers,
  restoreDefault,
  samePlan,
  stepKey,
  withEdits,
} from '@/features/adwamuha/logic/plan-edit';
import { copyDefaultPlan } from '@/features/adwamuha/logic/ward';
import { OWNER_TEXTS } from '@/features/adwamuha/generated/owner-texts';
import { stepLabel, stepSession } from '@/features/adwamuha/logic/setup';
import { useDhikrTexts } from '@/features/adwamuha/hooks/useDhikrTexts';
import type { UserPlan, UserPlanStep } from '@/data/models';

/**
 * «عدّل الخطة» (prompt §4.3; owner): later steps can be reordered, each step's weeks changed
 * (1–8), «استعادة الخطة الافتراضية», «قطعتها» on the current step or a later one (a step the
 * user already keeps joins the steps done, owner 2026-11-22), and «لم أقطعها بعد» on a step
 * done (it goes back right after the current step, owner 2026-11-26). The steps done are
 * folded in one row (redesign). Saving a change away from the default plan first shows the
 * light-plan notice with the hadith. The steps show by their first words, or the owner's
 * names (as in «ترتيب الورد»).
 */
export function PlanEditorScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const { colors, spacing } = useAppTheme();
  const { content } = useRepositories();
  const { stored, savePlan } = useAdwamuha();
  /** The current step as saved. */
  const saved = stored?.state.step ?? 1;

  // The user's changes to the order and weeks; until the first one, their saved plan (it
  // may still be loading).
  const [edited, setEdited] = useState<UserPlan | null>(null);
  const base = edited ?? stored?.plan ?? null;
  // The steps marked «قطعتها», and the steps done marked «لم أقطعها بعد», in the order
  // marked (applied when saved).
  const [passed, setPassed] = useState<string[]>([]);
  const [unpassed, setUnpassed] = useState<string[]>([]);
  const [defaultPlan, setDefaultPlan] = useState<UserPlan | null>(null);
  const texts = useDhikrTexts();
  const [reordering, setReordering] = useState(false);
  const [doneOpen, setDoneOpen] = useState(false);

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

  // The plan as it would be saved.
  const draft = useMemo(
    () => (base ? withEdits(base, saved, passed, unpassed) : null),
    [base, saved, passed, unpassed],
  );
  const marks = passed.length + unpassed.length;
  const dirty = Boolean(draft && stored && (marks > 0 || !samePlan(draft, stored.plan)));
  if (!draft || !base || !stored)
    return <View style={[styles.fill, { backgroundColor: colors.background }]} />;

  /** The current step once saved. */
  const current = editedCurrent(saved, passed.length, unpassed.length);
  const finished = stored.state.maintenance;
  const mayPass = !finished && current < draft.steps.length;
  const kept = current - 1 - passed.length;

  const save = async () => {
    await savePlan(draft, passed.length, unpassed.length);
    toast.show({ message: t('adwamuha.plan.saved'), icon: 'check', tone: 'gold' });
    router.back();
  };
  const onSave = () => {
    // Back to the default plan needs no warning; any other change does.
    const backToDefault =
      defaultPlan &&
      marks === 0 &&
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
            setUnpassed([]);
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
  const toggle = (list: string[], set: (next: string[]) => void, s: UserPlanStep) =>
    set(list.includes(stepKey(s)) ? list.filter((k) => k !== stepKey(s)) : [...list, stepKey(s)]);

  const session = (s: UserPlanStep) => t(`adwamuha.plan.${stepSession(s)}`);
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
          renderItem={(s) => (
            <View style={{ paddingVertical: spacing.sm }}>
              <AppText variant="bodyStrong">{`${session(s)} · ${stepLabel(s, texts)}`}</AppText>
            </View>
          )}
        />
      </SafeAreaView>
    );
  }

  const weeksStepper = (s: UserPlanStep, position: number) => (
    <WeeksStepper
      weeks={s.weeks}
      step={position}
      onFewer={() => setWeeks(s, s.weeks - 1)}
      onMore={() => setWeeks(s, s.weeks + 1)}
    />
  );
  const passButton = (s: UserPlanStep, position: number) =>
    mayPass ? (
      <Button
        title={OWNER_TEXTS.labels.stepPassed}
        kind="secondary"
        size="small"
        accessibilityLabel={t('adwamuha.plan.passLabel', {
          step: position,
          passed: OWNER_TEXTS.labels.stepPassed,
        })}
        onPress={() => toggle(passed, setPassed, s)}
      />
    ) : null;
  const undoButton = (
    s: UserPlanStep,
    position: number,
    list: string[],
    set: (n: string[]) => void,
  ) => (
    <Button
      title={t('adwamuha.plan.unpass')}
      kind="secondary"
      size="small"
      accessibilityLabel={t('adwamuha.plan.unpassLabel', { step: position })}
      onPress={() => toggle(list, set, s)}
    />
  );

  return (
    <SafeAreaView edges={[]} style={[styles.fill, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm + 2 }}>
        <AppText tone="muted" style={styles.intro}>
          {t('adwamuha.plan.intro', { passed: OWNER_TEXTS.labels.stepPassed })}
        </AppText>

        {kept > 0 ? (
          // The steps done, folded in one row (owner, 2026-11-25): tap to open or close.
          <View style={[styles.card, styles.fold, { backgroundColor: colors.surfaceMuted }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: doneOpen }}
              onPress={() => setDoneOpen((o) => !o)}
              style={[styles.row, { gap: spacing.sm + 2 }]}
            >
              <IconTile icon="check" />
              <View style={styles.fill}>
                <AppText style={styles.strong}>
                  {kept === 1
                    ? t('adwamuha.plan.step', { step: 1 })
                    : t('adwamuha.plan.doneSteps', { from: 1, to: kept })}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {t('adwamuha.plan.done')}
                </AppText>
              </View>
              <View style={doneOpen && styles.flip}>
                <Icon name="down" size={18} color={colors.textFaint} />
              </View>
            </Pressable>
            {doneOpen
              ? draft.steps.slice(0, kept).map((s, i) => (
                  <View
                    key={stepKey(s)}
                    style={[styles.doneRow, { borderTopColor: colors.border, gap: spacing.sm }]}
                  >
                    <View style={styles.fill}>
                      <AppText variant="caption" tone="muted">
                        {`${t('adwamuha.plan.step', { step: i + 1 })} · ${session(s)}`}
                      </AppText>
                      <DhikrText size={16} style={styles.start}>
                        {stepLabel(s, texts)}
                      </DhikrText>
                    </View>
                    {finished ? null : (
                      <Button
                        title={t('adwamuha.plan.notPassed')}
                        kind="secondary"
                        size="small"
                        accessibilityLabel={t('adwamuha.plan.notPassedLabel', {
                          step: i + 1,
                          notPassed: t('adwamuha.plan.notPassed'),
                        })}
                        onPress={() => toggle(unpassed, setUnpassed, s)}
                      />
                    )}
                  </View>
                ))
              : null}
          </View>
        ) : null}

        {draft.steps.slice(kept).map((s, i) => {
          const position = kept + i + 1;
          const isMarked = position < current;
          const isCurrent = position === current;
          const isBack = position > current && position <= current + unpassed.length;
          return (
            <StepCard
              key={stepKey(s)}
              title={t('adwamuha.plan.step', { step: position })}
              current={isCurrent}
              badge={
                isCurrent ? (
                  <Badge tone="primary">{t('adwamuha.plan.current')}</Badge>
                ) : isMarked ? (
                  <Badge tone="gold">{t('adwamuha.plan.done')}</Badge>
                ) : isBack ? (
                  <Badge tone="primary">{t('adwamuha.plan.notPassed')}</Badge>
                ) : null
              }
              action={
                isMarked
                  ? undoButton(s, position, passed, setPassed)
                  : isBack
                    ? undoButton(s, position, unpassed, setUnpassed)
                    : passButton(s, position)
              }
              label={stepLabel(s, texts)}
              session={session(s)}
              stepper={isMarked ? null : weeksStepper(s, position)}
            />
          );
        })}

        <View style={[styles.row, styles.links]}>
          <TextButton
            title={t('adwamuha.plan.reorder')}
            icon="grip"
            onPress={() => setReordering(true)}
            // Not with a step put back but not saved yet (its place is not settled).
            disabled={current >= draft.steps.length - 1 || unpassed.length > 0}
          />
          <TextButton title={OWNER_TEXTS.labels.resetPlan} icon="reset" onPress={reset} />
        </View>
      </ScrollView>

      {/* Always in sight, lit after a change (design `.savebar`). */}
      <View
        style={[
          styles.saveBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 6,
          },
        ]}
      >
        <Button title={t('adwamuha.plan.save')} onPress={onSave} disabled={!dirty} />
      </View>
    </SafeAreaView>
  );
}

/** One step (design `.pstep`): the current one framed in teal. */
function StepCard({
  title,
  current,
  badge,
  action,
  label,
  session,
  stepper,
}: {
  title: string;
  current: boolean;
  badge: ReactNode;
  action: ReactNode;
  label: string;
  session: string;
  stepper: ReactNode;
}) {
  const { colors, spacing } = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: current ? colors.primary : colors.border,
          borderWidth: current ? 2 : 1,
          gap: spacing.sm,
        },
      ]}
    >
      <View style={[styles.row, { gap: spacing.sm }]}>
        <AppText style={styles.strong}>{title}</AppText>
        {badge}
        <View style={styles.fill} />
        {action}
      </View>
      <DhikrText size={17} style={styles.start}>
        {label}
      </DhikrText>
      <View style={[styles.row, { gap: spacing.sm }]}>
        <AppText variant="caption" tone="muted" style={styles.fill}>
          {session}
        </AppText>
        {stepper}
      </View>
    </View>
  );
}

function Badge({ tone, children }: { tone: 'primary' | 'gold'; children: string }) {
  const { colors } = useAppTheme();
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: tone === 'gold' ? colors.accentSoft : colors.primarySoft },
      ]}
    >
      <AppText
        style={[
          styles.badgeText,
          { color: tone === 'gold' ? colors.accentInk : colors.primaryInk },
        ]}
      >
        {children}
      </AppText>
    </View>
  );
}

/** The weeks of a step, 1–8, with + and − (design `.mini-step`). */
function WeeksStepper({
  weeks,
  step,
  onFewer,
  onMore,
}: {
  weeks: number;
  step: number;
  onFewer: () => void;
  onMore: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const button = (
    icon: 'plus' | 'minus',
    label: string,
    onPress: () => void,
    disabled: boolean,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={[styles.miniButton, { backgroundColor: colors.surface }, disabled && { opacity: 0.4 }]}
    >
      <Icon name={icon} size={15} color={colors.primaryInk} />
    </Pressable>
  );
  return (
    <View style={[styles.row, styles.mini, { backgroundColor: colors.surfaceMuted }]}>
      {button('plus', t('adwamuha.plan.moreWeeks', { step }), onMore, weeks >= MAX_STEP_WEEKS)}
      <AppText style={styles.weeks}>{t('adwamuha.plan.weeks', { count: weeks })}</AppText>
      {button('minus', t('adwamuha.plan.fewerWeeks', { step }), onFewer, weeks <= MIN_STEP_WEEKS)}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  intro: { fontSize: 14, lineHeight: 23 },
  card: { borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14 },
  fold: { gap: 4 },
  flip: { transform: [{ rotate: '180deg' }] },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    marginTop: 4,
  },
  strong: { fontFamily: UI_FONTS.semibold, fontSize: 15, lineHeight: 22 },
  start: { textAlign: 'auto' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  badgeText: { fontFamily: UI_FONTS.semibold, fontSize: 12, lineHeight: 18 },
  links: { justifyContent: 'center', flexWrap: 'wrap', gap: 24 },
  saveBar: { paddingTop: 12, paddingHorizontal: 16, borderTopWidth: 1 },
  mini: { gap: 6, borderRadius: 11, padding: 3 },
  miniButton: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weeks: {
    fontFamily: UI_FONTS.semibold,
    fontSize: 13,
    lineHeight: 20,
    minWidth: 62,
    textAlign: 'center',
  },
});
