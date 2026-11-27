import { useReducer, useState } from 'react';
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
import type { UserPlan, UserPlanStep } from '@/data/models';
import { HadithCard } from '@/features/adwamuha/components/HadithCard';
import { PlanBadge, PlanStepCard } from '@/features/adwamuha/components/PlanStepCard';
import { WeeksStepper } from '@/features/adwamuha/components/WeeksStepper';
import { OWNER_TEXTS } from '@/features/adwamuha/generated/owner-texts';
import { useDhikrTexts } from '@/features/adwamuha/hooks/useDhikrTexts';
import { canMove, restoreDefault, samePlan, stepKey } from '@/features/adwamuha/logic/plan-edit';
import {
  NO_EDITS,
  planEditorView,
  planEditsReducer,
} from '@/features/adwamuha/logic/plan-editor-state';
import { stepLabel, stepSession } from '@/features/adwamuha/logic/setup';
import { copyDefaultPlan } from '@/features/adwamuha/logic/ward';
import { useAdwamuha } from '@/features/adwamuha/state/AdwamuhaProvider';
import { useAsync } from '@/hooks/useAsync';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

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
  const [edits, dispatch] = useReducer(planEditsReducer, NO_EDITS);
  const defaultPlan = useAsync<UserPlan | null>(
    () => content.getDefaultPlan(i18n.language).then(copyDefaultPlan),
    [content, i18n.language],
    null,
  );
  const texts = useDhikrTexts();
  const [reordering, setReordering] = useState(false);
  const [doneOpen, setDoneOpen] = useState(false);

  if (!stored) return <View style={[styles.fill, { backgroundColor: colors.background }]} />;
  const { passed, unpassed } = edits;
  const { base, draft, marks, dirty, current, mayPass, kept } = planEditorView(
    stored.plan,
    saved,
    stored.state.maintenance,
    edits,
  );
  const finished = stored.state.maintenance;

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
            dispatch({ type: 'reset', plan: restoreDefault(stored.plan, saved, defaultPlan) });
          },
        },
        { label: t('common.cancel'), cancel: true },
      ],
    });
  const setWeeks = (step: UserPlanStep, weeks: number) =>
    dispatch({ type: 'weeks', base, step, weeks });

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
            dispatch({ type: 'reorder', base, savedStep: saved, later: steps.slice(current - 1) })
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
        onPress={() => dispatch({ type: 'pass', step: s })}
      />
    ) : null;
  /** Takes a mark back: passed (`pass`) or put back (`unpass`). */
  const undoButton = (s: UserPlanStep, position: number, mark: 'pass' | 'unpass') => (
    <Button
      title={t('adwamuha.plan.unpass')}
      kind="secondary"
      size="small"
      accessibilityLabel={t('adwamuha.plan.unpassLabel', { step: position })}
      onPress={() => dispatch({ type: mark, step: s })}
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
                        onPress={() => dispatch({ type: 'unpass', step: s })}
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
            <PlanStepCard
              key={stepKey(s)}
              title={t('adwamuha.plan.step', { step: position })}
              current={isCurrent}
              badge={
                isCurrent ? (
                  <PlanBadge tone="primary">{t('adwamuha.plan.current')}</PlanBadge>
                ) : isMarked ? (
                  <PlanBadge tone="gold">{t('adwamuha.plan.done')}</PlanBadge>
                ) : isBack ? (
                  <PlanBadge tone="primary">{t('adwamuha.plan.notPassed')}</PlanBadge>
                ) : null
              }
              action={
                isMarked
                  ? undoButton(s, position, 'pass')
                  : isBack
                    ? undoButton(s, position, 'unpass')
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
  links: { justifyContent: 'center', flexWrap: 'wrap', gap: 24 },
  saveBar: { paddingTop: 12, paddingHorizontal: 16, borderTopWidth: 1 },
});
