import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { SortableList } from '@/components/SortableList';
import { useToast } from '@/components/Toast';
import { APP_CONFIG } from '@/config/app-config';
import { useRepositories } from '@/data/DataProvider';
import { useAppTheme } from '@/theme/ThemeProvider';

import { useAdwamuha } from './AdwamuhaProvider';
import { HadithCard } from './HadithCard';
import { MAX_STEP_WEEKS, MIN_STEP_WEEKS, canMove, samePlan } from './logic/plan-edit';
import type { UserPlan, UserPlanStep } from './logic/types';
import { copyDefaultPlan } from './logic/ward';
import { OWNER_TEXTS } from './owner-texts';

const keyOf = (s: UserPlanStep) => `${s.morningDhikrId}:${s.eveningDhikrId}`;

/** The first words of a dhikr (from the content), for the step list. */
const firstWords = (text: string, n = 6) => {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  return words.slice(0, n).join(' ') + (words.length > n ? ' …' : '');
};

/**
 * «عدّل الخطة» (prompt §4.3; owner): later steps can be reordered, each step's
 * weeks changed (1–8), and «استعادة الخطة الافتراضية». Saving a change away from
 * the default plan first shows the light-plan notice with the hadith.
 */
export function PlanEditorScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { colors, radii, spacing } = useAppTheme();
  const { content } = useRepositories();
  const { stored, savePlan } = useAdwamuha();
  const current = stored?.state.step ?? 1;

  // The user's changes; until the first one, their saved plan (it may still be loading).
  const [edited, setDraft] = useState<UserPlan | null>(null);
  const draft = edited ?? stored?.plan ?? null;
  const [defaultPlan, setDefaultPlan] = useState<UserPlan | null>(null);
  const [texts, setTexts] = useState(new Map<number, string>());
  const [reordering, setReordering] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const lang = i18n.language;
    Promise.all([
      content.getDefaultPlan(lang),
      content.listAdhkar(APP_CONFIG.content.morningCategoryId, lang),
      content.listAdhkar(APP_CONFIG.content.eveningCategoryId, lang),
    ])
      .then(([plan, morning, evening]) => {
        if (cancelled) return;
        setDefaultPlan(copyDefaultPlan(plan));
        setTexts(new Map([...morning, ...evening].map((d) => [d.id, firstWords(d.text)])));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [content, i18n.language]);

  const dirty = useMemo(
    () => Boolean(draft && stored && !samePlan(draft, stored.plan)),
    [draft, stored],
  );
  if (!draft || !stored)
    return <View style={[styles.fill, { backgroundColor: colors.background }]} />;

  const save = async () => {
    setConfirming(false);
    await savePlan(draft);
    toast.show({ message: t('adwamuha.plan.saved') });
    router.back();
  };
  const onSave = () => {
    // Back to the default plan needs no warning; any other change does.
    if (defaultPlan && samePlan(draft, defaultPlan)) void save();
    else setConfirming(true);
  };
  const reset = () =>
    Alert.alert(OWNER_TEXTS.labels.resetPlan, t('adwamuha.plan.resetBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: OWNER_TEXTS.labels.resetPlan, onPress: () => defaultPlan && setDraft(defaultPlan) },
    ]);
  const setWeeks = (position: number, weeks: number) =>
    setDraft({
      ...draft,
      steps: draft.steps.map((s, i) => (i === position - 1 ? { ...s, weeks } : s)),
    });

  const describe = (s: UserPlanStep) => {
    const session =
      s.morningDhikrId !== null && s.eveningDhikrId !== null
        ? t('adwamuha.plan.both')
        : s.morningDhikrId !== null
          ? t('adwamuha.plan.morning')
          : t('adwamuha.plan.evening');
    const id = s.morningDhikrId ?? s.eveningDhikrId!;
    return { session, words: texts.get(id) ?? '' };
  };
  const positionOf = (s: UserPlanStep) => draft.steps.findIndex((x) => keyOf(x) === keyOf(s)) + 1;

  if (reordering) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={[styles.fill, { backgroundColor: colors.background }]}
      >
        <SortableList
          items={draft.steps}
          keyOf={keyOf}
          title={t('adwamuha.plan.reorder')}
          hint={t('adwamuha.plan.reorderHint')}
          dragLabel={(s) => t('adwamuha.plan.drag', { step: positionOf(s) })}
          canDrag={(s) => canMove(positionOf(s), current, draft)}
          canDrop={(from, to) =>
            canMove(from + 1, current, draft) && canMove(to + 1, current, draft)
          }
          onReorder={(steps) => setDraft({ ...draft, steps })}
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
        <AppText tone="muted">{t('adwamuha.plan.intro')}</AppText>
        {draft.steps.map((s, i) => {
          const position = i + 1;
          const { session, words } = describe(s);
          const editable = position >= current;
          return (
            <View
              key={keyOf(s)}
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
                      onPress={() => setWeeks(position, s.weeks - 1)}
                      disabled={s.weeks <= MIN_STEP_WEEKS}
                    />
                    <IconButton
                      icon="plus"
                      label={t('adwamuha.plan.moreWeeks', { step: position })}
                      onPress={() => setWeeks(position, s.weeks + 1)}
                      disabled={s.weeks >= MAX_STEP_WEEKS}
                    />
                  </>
                ) : null}
              </View>
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

      <Modal
        visible={confirming}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirming(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setConfirming(false)}>
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                padding: spacing.lg,
                gap: spacing.md,
              },
            ]}
          >
            <AppText variant="heading" accessibilityRole="header">
              {t('adwamuha.plan.confirmTitle')}
            </AppText>
            <AppText>{t('adwamuha.plan.confirmBody')}</AppText>
            <HadithCard />
            <Button title={t('adwamuha.plan.confirmKeep')} onPress={() => setConfirming(false)} />
            <Button
              title={t('adwamuha.plan.confirmSave')}
              kind="secondary"
              onPress={() => void save()}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  // The screen behind, dimmed (same in light and dark).
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: { width: '100%', maxWidth: 420, alignSelf: 'center' },
});
