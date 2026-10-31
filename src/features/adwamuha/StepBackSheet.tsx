import { Modal, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useAppTheme } from '@/theme/ThemeProvider';

import { useAdwamuha } from './AdwamuhaProvider';
import { type StepBack, stepBackTarget } from './logic/progress';
import { OWNER_TEXTS } from './owner-texts';

/**
 * «طرأ عليّ ظرف أو مستجد في حياتي» (prompt §7): no list of reasons, only the
 * choices — half the step, the first three steps, a break of 1 or 2 weeks, or
 * cancel. `suggestion`: shown once as a gentle suggestion (low commitment).
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
  const { stored, activeBreak, stepBack, takeBreak, endBreak } = useAdwamuha();
  const step = stored?.state.step ?? 1;

  const run = async (action: () => Promise<void>) => {
    onClose();
    await action();
    onDone?.();
  };
  const back = (kind: StepBack) => () => void run(() => stepBack(kind));
  const half = stepBackTarget(step, 'half');
  const firstThree = stepBackTarget(step, 'firstThree');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
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
                  onClose();
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
            onPress={onClose}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // The screen behind, dimmed (same in light and dark).
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: { width: '100%', maxWidth: 420, alignSelf: 'center' },
});
