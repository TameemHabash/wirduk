import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { useAppTheme } from '@/theme/ThemeProvider';

import { useAdwamuha } from './AdwamuhaProvider';
import { type StepBack, lastStepBackChoice, stepBackTarget } from './logic/progress';
import { OWNER_TEXTS } from './owner-texts';
import { stepLabel, stepSession } from './setup';
import { useDhikrTexts } from './useDhikrTexts';

/**
 * «طرأ عليّ ظرف أو مستجد في حياتي» (prompt §7): no list of reasons, only the
 * choices — half the step, the first three steps, a step picked with − and +
 * («ارجع إلى الخطوة:», owner, 2026-11-22), a break of 1 or 2 weeks, or cancel.
 * `suggestion`: shown once as a gentle suggestion (low commitment).
 * Afterwards the message card (Home, «مساري») shows the word for a step back.
 */
export function StepBackSheet({
  visible,
  onClose,
  onDone,
  suggestion = false,
}: {
  visible: boolean;
  onClose: () => void;
  /** After a choice was saved (e.g. to scroll up to the message card). */
  onDone?: () => void;
  suggestion?: boolean;
}) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useAppTheme();
  // The modal draws under the status bar: keep the sheet clear of it when it is tall.
  const insets = useSafeAreaInsets();
  const { stored, activeBreak, stepBack, takeBreak, endBreak } = useAdwamuha();
  const step = stored?.state.step ?? 1;
  const texts = useDhikrTexts(visible);

  // «ارجع إلى الخطوة:»: one step back until − or + is pressed; again so each time it opens.
  const last = lastStepBackChoice(step);
  const [picked, setPicked] = useState<number | null>(null);
  const to = Math.max(1, Math.min(last, picked ?? last));
  const toStep = stored?.plan.steps[to - 1];

  const close = () => {
    setPicked(null);
    onClose();
  };
  const run = async (action: () => Promise<void>) => {
    close();
    await action();
    onDone?.();
  };
  const back = (kind: StepBack) => () => void run(() => stepBack(kind));
  const half = stepBackTarget(step, 'half');
  const firstThree = stepBackTarget(step, 'firstThree');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable
        style={[
          styles.backdrop,
          { paddingTop: GAP + insets.top, paddingBottom: GAP + insets.bottom },
        ]}
        onPress={close}
      >
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface, borderRadius: radii.lg }]}
        >
          {/* Taller with the step picker: it scrolls on a small screen or with a big font. */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          >
            <AppText variant="heading" accessibilityRole="header">
              {OWNER_TEXTS.labels.lifeChange}
            </AppText>
            <AppText tone="muted">
              {suggestion ? t('adwamuha.stepBack.suggestion') : t('adwamuha.stepBack.intro')}
            </AppText>
            <Button
              title={t('adwamuha.stepBack.half', { step: half })}
              kind="secondary"
              onPress={back('half')}
              disabled={half >= step}
            />
            <Button
              title={t('adwamuha.stepBack.firstThree', { step: firstThree })}
              kind="secondary"
              onPress={back('firstThree')}
              disabled={firstThree >= step}
            />
            {last >= 1 ? (
              <View
                style={{
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: radii.md,
                  padding: spacing.md,
                  gap: spacing.sm,
                }}
              >
                <View style={[styles.row, { gap: spacing.xs }]}>
                  <AppText variant="bodyStrong" style={styles.fill}>
                    {OWNER_TEXTS.labels.stepBackTo}
                  </AppText>
                  <IconButton
                    icon="minus"
                    label={t('adwamuha.stepBack.earlier')}
                    onPress={() => setPicked(to - 1)}
                    disabled={to <= 1}
                  />
                  <AppText
                    variant="title"
                    tone="primary"
                    style={styles.number}
                    accessibilityLiveRegion="polite"
                  >
                    {to}
                  </AppText>
                  <IconButton
                    icon="plus"
                    label={t('adwamuha.stepBack.later')}
                    onPress={() => setPicked(to + 1)}
                    disabled={to >= last}
                  />
                </View>
                {toStep ? (
                  <View
                    style={{
                      backgroundColor: colors.surfaceMuted,
                      borderRadius: radii.sm,
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.md,
                    }}
                  >
                    <AppText tone="muted">{stepLabel(toStep, texts)}</AppText>
                    <AppText variant="caption" tone="muted">
                      {t(`adwamuha.plan.${stepSession(toStep)}`)}
                    </AppText>
                  </View>
                ) : null}
                <Button
                  title={t('adwamuha.stepBack.toStep', { step: to })}
                  kind="secondary"
                  onPress={back({ step: to })}
                />
              </View>
            ) : null}
            <AppText variant="caption" tone="muted">
              {t('adwamuha.stepBack.climbHint')}
            </AppText>
            {activeBreak ? (
              <>
                <AppText>
                  {t('adwamuha.stepBack.onBreak', {
                    day: Number(activeBreak.to.slice(8, 10)),
                    month: Number(activeBreak.to.slice(5, 7)),
                  })}
                </AppText>
                <Button
                  title={t('adwamuha.stepBack.endBreak')}
                  kind="secondary"
                  onPress={() => {
                    close();
                    void endBreak();
                  }}
                />
              </>
            ) : (
              <>
                <Button
                  title={t('adwamuha.stepBack.break1')}
                  kind="secondary"
                  onPress={() => void run(() => takeBreak(1))}
                />
                <Button
                  title={t('adwamuha.stepBack.break2')}
                  kind="secondary"
                  onPress={() => void run(() => takeBreak(2))}
                />
                <AppText variant="caption" tone="muted">
                  {t('adwamuha.stepBack.breakHint')}
                </AppText>
              </>
            )}
            <Button
              title={suggestion ? t('adwamuha.stepBack.suggestionNo') : t('common.cancel')}
              onPress={close}
            />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Space around the sheet (plus the status and navigation bars above and below). */
const GAP = 24;

const styles = StyleSheet.create({
  // The screen behind, dimmed (same in light and dark).
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: GAP,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: { width: '100%', maxWidth: 420, maxHeight: '100%', alignSelf: 'center' },
  // As tall as its content, up to the sheet's height.
  scroll: { flexGrow: 0 },
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  number: { minWidth: 32, textAlign: 'center' },
});
