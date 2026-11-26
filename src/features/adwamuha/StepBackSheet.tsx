import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { DhikrText } from '@/components/DhikrText';
import { Icon } from '@/components/Icon';
import { IconTile } from '@/components/IconTile';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { useAdwamuha } from './AdwamuhaProvider';
import { lastStepBackChoice } from './logic/progress';
import { OWNER_TEXTS } from './owner-texts';
import { stepLabel, stepSession } from './setup';
import { useDhikrTexts } from './useDhikrTexts';

/**
 * «طرأ عليّ ظرف أو مستجد في حياتي» (prompt §7), a sheet from the bottom (redesign): no list
 * of reasons, only the choices — a step picked with − and + («ارجع إلى الخطوة:», owner,
 * 2026-11-22; «نصف الخطوة» and «الخطوات الأولى» were removed, owner 2026-11-25), a break of
 * 1 or 2 weeks, or cancel. On step 1 only the breaks. `suggestion`: shown once as a gentle
 * suggestion (low commitment). Afterwards the message card (Home, «مساري») shows the word.
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
  const { colors, spacing } = useAppTheme();
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

  const option = { borderColor: colors.border, backgroundColor: colors.surface };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={close}
    >
      <View style={styles.layer}>
        <Pressable
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          onPress={close}
        />
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { backgroundColor: colors.surface, marginTop: insets.top + 24 }]}
        >
          {/* It scrolls on a small screen or with a big font. */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={{
              paddingHorizontal: spacing.lg,
              paddingTop: 10,
              paddingBottom: insets.bottom + spacing.md,
              gap: spacing.md,
            }}
          >
            <View style={[styles.grab, { backgroundColor: colors.borderStrong }]} />
            <AppText accessibilityRole="header" style={styles.title}>
              {OWNER_TEXTS.labels.lifeChange}
            </AppText>
            <AppText tone="muted" style={styles.intro}>
              {suggestion ? t('adwamuha.stepBack.suggestion') : t('adwamuha.stepBack.intro')}
            </AppText>

            {last >= 1 ? (
              <View style={[styles.option, option, { gap: spacing.sm + 2 }]}>
                <AppText style={styles.strong}>{OWNER_TEXTS.labels.stepBackTo}</AppText>
                <View style={[styles.stepper, { backgroundColor: colors.surfaceMuted }]}>
                  <StepButton
                    icon="plus"
                    label={t('adwamuha.stepBack.later')}
                    onPress={() => setPicked(to + 1)}
                    disabled={to >= last}
                  />
                  <View style={styles.mid} accessibilityLiveRegion="polite">
                    <AppText style={styles.stepTitle}>
                      {t('adwamuha.plan.step', { step: to })}
                    </AppText>
                    {toStep ? (
                      <>
                        <DhikrText
                          size={15}
                          numberOfLines={2}
                          style={[styles.center, { color: colors.textMuted }]}
                        >
                          {stepLabel(toStep, texts)}
                        </DhikrText>
                        <AppText variant="caption" tone="muted" style={styles.center}>
                          {t(`adwamuha.plan.${stepSession(toStep)}`)}
                        </AppText>
                      </>
                    ) : null}
                  </View>
                  <StepButton
                    icon="minus"
                    label={t('adwamuha.stepBack.earlier')}
                    onPress={() => setPicked(to - 1)}
                    disabled={to <= 1}
                  />
                </View>
                <Button
                  title={t('adwamuha.stepBack.toStep', { step: to })}
                  kind="soft"
                  onPress={() => void run(() => stepBack({ step: to }))}
                />
                <AppText variant="caption" tone="faint">
                  {t('adwamuha.stepBack.climbHint')}
                </AppText>
              </View>
            ) : null}

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
                <View style={[styles.row, { gap: spacing.sm + 2 }]}>
                  {([1, 2] as const).map((weeks) => (
                    <Pressable
                      key={weeks}
                      accessibilityRole="button"
                      onPress={() => void run(() => takeBreak(weeks))}
                      style={({ pressed }) => [
                        styles.option,
                        styles.breakOption,
                        option,
                        pressed && { backgroundColor: colors.surfaceMuted },
                      ]}
                    >
                      <IconTile icon="pauseCup" tone="gold" />
                      <AppText style={[styles.strong, styles.fill]}>
                        {t(`adwamuha.stepBack.break${weeks}`)}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
                <AppText variant="caption" tone="faint">
                  {t('adwamuha.stepBack.breakHint')}
                </AppText>
              </>
            )}
            <Button
              title={suggestion ? t('adwamuha.stepBack.suggestionNo') : t('common.cancel')}
              kind="plain"
              onPress={close}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function StepButton({
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
  layer: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '100%',
    overflow: 'hidden',
  },
  // As tall as its content, up to the screen's height.
  scroll: { flexGrow: 0 },
  grab: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center' },
  title: { fontFamily: UI_FONTS.semibold, fontSize: 18, lineHeight: 28 },
  intro: { fontSize: 14, lineHeight: 23 },
  strong: { fontFamily: UI_FONTS.semibold, fontSize: 15, lineHeight: 22 },
  option: { borderWidth: 1.5, borderRadius: 16, paddingVertical: 13, paddingHorizontal: 14 },
  breakOption: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, padding: 5 },
  stepButton: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mid: { flex: 1, alignItems: 'center' },
  stepTitle: { fontFamily: UI_FONTS.semibold, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'stretch' },
});
