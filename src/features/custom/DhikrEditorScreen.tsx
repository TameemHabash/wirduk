import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { TextField } from '@/components/TextField';
import { useRepositories } from '@/data/DataProvider';
import type { Dhikr } from '@/data/models';
import { CUSTOM_LIMITS, CustomContentError } from '@/data/repositories/custom-repository';
import { useSettings } from '@/data/settings/SettingsProvider';
import { counterStore } from '@/features/counter/counter-store';
import { useDirection } from '@/i18n/direction';
import { UI_FONTS, dhikrLineHeight, findDhikrFont } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TOUCH_TARGET } from '@/theme/tokens';

import { AudioField } from './AudioField';
import { deleteCustomAudio } from './custom-audio';
import { customErrorMessage } from './errors';
import { useUnsavedGuard } from './useUnsavedGuard';

interface Form {
  text: string;
  count: string;
  fadl: string;
  source: string;
  audioFile: string | null;
}

const EMPTY_FORM: Form = { text: '', count: '1', fadl: '', source: '', audioFile: null };

const fromDhikr = (d: Dhikr): Form => ({
  text: d.text,
  count: String(d.count),
  fadl: d.source?.fadl ?? '',
  source: d.source?.source ?? '',
  audioFile: d.audioFile,
});

const sameForm = (a: Form, b: Form) =>
  a.text === b.text &&
  a.count === b.count &&
  a.fadl === b.fadl &&
  a.source === b.source &&
  a.audioFile === b.audioFile;

type ErrorField = 'text' | 'count' | 'notes' | 'general';
const FIELD_OF: Record<CustomContentError['code'], ErrorField> = {
  emptyText: 'text',
  textTooLong: 'text',
  badCount: 'count',
  noteTooLong: 'notes',
  emptyTitle: 'general',
  titleTooLong: 'general',
  notFound: 'general',
};

/** Create or edit one of the user's own adhkar (route: /custom/[id]/dhikr/[dhikrId|new]). */
export function DhikrEditorScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { custom } = useRepositories();
  const { settings } = useSettings();
  const { colors, radii, spacing } = useAppTheme();
  const { isRtl } = useDirection();
  const params = useLocalSearchParams<{ id: string; dhikrId: string }>();
  const categoryId = Number(params.id);
  const isNew = params.dhikrId === 'new';
  const dhikrId = isNew ? null : Number(params.dhikrId);

  const [initial, setInitial] = useState<Form>(EMPTY_FORM);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [loaded, setLoaded] = useState(isNew);
  const [error, setError] = useState<{ field: ErrorField; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (dhikrId == null) return;
    let cancelled = false;
    custom.getDhikr(dhikrId).then((d) => {
      if (cancelled) return;
      if (!d) {
        setError({ field: 'general', message: t('custom.errors.notFound') });
      } else {
        setInitial(fromDhikr(d));
        setForm(fromDhikr(d));
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [custom, dhikrId, t]);

  const dirty = !sameForm(form, initial);
  // Leaving without saving: drop a recording made on this screen.
  const { allowLeave } = useUnsavedGuard(dirty, () => {
    if (form.audioFile && form.audioFile !== initial.audioFile) deleteCustomAudio(form.audioFile);
  });

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setError(null);
    setForm((f) => ({ ...f, [key]: value }));
  };

  const setAudio = (next: string | null) => {
    // A new recording replaces another unsaved one: delete the unsaved file now.
    const previous = form.audioFile;
    if (previous && previous !== initial.audioFile && previous !== next)
      deleteCustomAudio(previous);
    set('audioFile', next);
  };

  const stepCount = (delta: 1 | -1) => {
    const n = Number.parseInt(form.count, 10);
    const next = Math.min(
      CUSTOM_LIMITS.countMax,
      Math.max(1, (Number.isFinite(n) ? n : 1) + delta),
    );
    set('count', String(next));
  };

  const save = async () => {
    setSaving(true);
    const input = {
      text: form.text,
      count: /^\d+$/.test(form.count.trim()) ? Number(form.count.trim()) : Number.NaN,
      fadl: form.fadl,
      source: form.source,
      audioFile: form.audioFile,
    };
    try {
      if (dhikrId == null) {
        await custom.createDhikr(categoryId, input);
      } else {
        const { oldAudioFile } = await custom.updateDhikr(dhikrId, input);
        deleteCustomAudio(oldAudioFile);
      }
      allowLeave();
      router.back();
    } catch (e) {
      const message = customErrorMessage(t, e);
      setError({ field: e instanceof CustomContentError ? FIELD_OF[e.code] : 'general', message });
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (dhikrId == null) return;
    Alert.alert(t('custom.deleteDhikrConfirmTitle'), t('custom.deleteDhikrConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('custom.delete'),
        style: 'destructive',
        onPress: async () => {
          const { audioFile } = await custom.deleteDhikr(dhikrId);
          deleteCustomAudio(audioFile, form.audioFile);
          counterStore.reset(dhikrId);
          allowLeave();
          router.back();
        },
      },
    ]);
  };

  const font = findDhikrFont(settings.dhikrFont);
  const fieldError = (field: ErrorField) => (error?.field === field ? error.message : null);

  return (
    <SafeAreaView edges={['bottom']} style={[styles.fill, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{ title: t(isNew ? 'custom.newDhikrTitle' : 'custom.editDhikrTitle') }}
      />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loaded && (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              padding: spacing.lg,
              gap: spacing.lg,
              paddingBottom: spacing.xxxl,
            }}
          >
            <TextField
              label={t('custom.dhikrText')}
              placeholder={t('custom.dhikrTextPlaceholder')}
              value={form.text}
              onChangeText={(v) => set('text', v)}
              multiline
              maxLength={CUSTOM_LIMITS.textMax}
              error={fieldError('text')}
              inputStyle={{
                fontFamily: font.family,
                fontSize: 22,
                lineHeight: dhikrLineHeight(font.id, 22),
                minHeight: 140,
              }}
            />

            <View style={{ gap: spacing.xs }}>
              <AppText variant="label" tone="muted">
                {t('custom.count')}
              </AppText>
              <View style={[styles.row, { gap: spacing.sm }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('custom.decreaseCount')}
                  onPress={() => stepCount(-1)}
                  style={[
                    styles.step,
                    { backgroundColor: colors.surfaceMuted, borderRadius: radii.sm },
                  ]}
                >
                  <Icon name="minus" />
                </Pressable>
                <TextInput
                  value={form.count}
                  onChangeText={(v) => set('count', v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  maxLength={6}
                  accessibilityLabel={t('custom.count')}
                  style={[
                    styles.countInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.surface,
                      borderColor: fieldError('count') ? colors.danger : colors.border,
                      borderRadius: radii.md,
                    },
                  ]}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('custom.increaseCount')}
                  onPress={() => stepCount(1)}
                  style={[
                    styles.step,
                    { backgroundColor: colors.surfaceMuted, borderRadius: radii.sm },
                  ]}
                >
                  <Icon name="plus" />
                </Pressable>
              </View>
              {fieldError('count') ? (
                <AppText variant="caption" tone="danger">
                  {fieldError('count')}
                </AppText>
              ) : null}
            </View>

            <TextField
              label={t('custom.fadl')}
              placeholder={t('custom.notePlaceholder')}
              value={form.fadl}
              onChangeText={(v) => set('fadl', v)}
              multiline
              maxLength={CUSTOM_LIMITS.noteMax}
              error={fieldError('notes')}
            />
            <TextField
              label={t('custom.source')}
              placeholder={t('custom.notePlaceholder')}
              value={form.source}
              onChangeText={(v) => set('source', v)}
              multiline
              maxLength={CUSTOM_LIMITS.noteMax}
            />

            <AudioField value={form.audioFile} onChange={setAudio} />

            {fieldError('general') ? (
              <AppText tone="danger" style={{ textAlign: isRtl ? 'right' : 'left' }}>
                {fieldError('general')}
              </AppText>
            ) : null}

            <View style={{ gap: spacing.md }}>
              <Button title={t('custom.save')} onPress={() => void save()} disabled={saving} />
              {!isNew && <Button title={t('custom.deleteDhikr')} kind="danger" onPress={remove} />}
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  step: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // No inner padding: Android's default padding plus the tall UI font cut the
  // digits at the top in a 44-point box. Centered both ways, and it grows with
  // a large system font size instead of cutting.
  countInput: {
    width: 110,
    minHeight: TOUCH_TARGET,
    borderWidth: 1,
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    fontFamily: UI_FONTS.semibold,
    fontSize: 18,
  },
});
