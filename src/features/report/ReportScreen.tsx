import { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Switch, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { APP_CONFIG } from '@/config/app-config';
import { useSettings } from '@/data/settings/SettingsProvider';
import { useAppTheme } from '@/theme/ThemeProvider';

import { freeStorageBytes } from './free-space';
import { collectDetails, sendReport } from './report';
import { type DetailKey, REPORT_LIMITS, descriptionLength } from './report-protocol';
import { type PickedImage, shrinkImage } from './shrink-image';

/**
 * "الإبلاغ عن مشكلة": a description, a few screenshots and the app/device
 * details, all shown here. Nothing is sent before "إرسال".
 */
export function ReportScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { settings } = useSettings();
  const { colors, radii, scheme, spacing } = useAppTheme();
  const endpoint = APP_CONFIG.report.endpoint;

  const [description, setDescription] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [withDetails, setWithDetails] = useState(true);
  const [busy, setBusy] = useState<'picking' | 'sending' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Read once when the screen opens: it is shown, then sent as it was shown.
  const [freeBytes] = useState(freeStorageBytes);
  const details = useMemo(
    () => collectDetails(settings, scheme, i18n.language, freeBytes),
    [settings, scheme, i18n.language, freeBytes],
  );
  const missing = REPORT_LIMITS.minChars - descriptionLength(description);
  const room = REPORT_LIMITS.maxImages - images.length;

  const addImages = async () => {
    setMessage(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled) return;
    const picked = result.assets.slice(0, room);
    setBusy('picking');
    const added: PickedImage[] = [];
    let failed = false;
    for (const asset of picked) {
      const image = await shrinkImage(asset.uri).catch(() => null);
      if (image) added.push(image);
      else failed = true;
    }
    setImages((current) => [...current, ...added].slice(0, REPORT_LIMITS.maxImages));
    setBusy(null);
    if (failed) setMessage(t('report.imageError'));
    else if (result.assets.length > picked.length) {
      setMessage(t('report.tooManyImages', { n: REPORT_LIMITS.maxImages }));
    }
  };

  const send = async () => {
    if (!endpoint) return;
    setMessage(null);
    setBusy('sending');
    const result = await sendReport(endpoint, {
      description: description.trim(),
      details: withDetails ? details : {},
      images: images.map(({ type, data }) => ({ type, data })),
    });
    setBusy(null);
    if (result.ok) {
      toast.show({ message: t('report.sent') });
      router.back();
    } else {
      setMessage(t(`report.errors.${result.error}`));
    }
  };

  if (!endpoint) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={[styles.fill, { backgroundColor: colors.background }]}
      >
        <AppText tone="muted" style={{ padding: spacing.lg }}>
          {t('report.errors.unavailable')}
        </AppText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.fill, { backgroundColor: colors.background }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}
      >
        <AppText tone="muted">{t('report.intro')}</AppText>

        <View style={{ gap: spacing.xs }}>
          <TextField
            label={t('report.description')}
            placeholder={t('report.descriptionPlaceholder')}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={REPORT_LIMITS.maxChars}
            inputStyle={{ minHeight: 140 }}
          />
          {missing > 0 && description.length > 0 ? (
            <AppText variant="caption" tone="muted">
              {t('report.tooShort', { n: REPORT_LIMITS.minChars })}
            </AppText>
          ) : null}
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" tone="muted" accessibilityRole="header">
            {t('report.screenshots')}
          </AppText>
          {images.length > 0 ? (
            <View style={[styles.thumbs, { gap: spacing.sm }]}>
              {images.map((image, i) => (
                <View key={image.uri} style={styles.thumbBox}>
                  <Image
                    source={{ uri: image.uri }}
                    accessibilityLabel={t('report.screenshot', { n: i + 1 })}
                    style={[styles.thumb, { borderRadius: radii.md, borderColor: colors.border }]}
                  />
                  <IconButton
                    icon="close"
                    size={18}
                    label={t('report.removeScreenshot', { n: i + 1 })}
                    onPress={() => setImages((current) => current.filter((x) => x !== image))}
                    style={[styles.remove, { backgroundColor: colors.surface }]}
                  />
                </View>
              ))}
            </View>
          ) : null}
          <Button
            kind="secondary"
            title={busy === 'picking' ? t('report.preparing') : t('report.addScreenshots')}
            onPress={() => void addImages()}
            disabled={room <= 0 || busy !== null}
          />
          <AppText variant="caption" tone="muted">
            {t('report.screenshotsHint', { n: REPORT_LIMITS.maxImages })}
          </AppText>
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" tone="muted" accessibilityRole="header">
            {t('report.details')}
          </AppText>
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radii.lg,
              padding: spacing.lg,
              gap: spacing.sm,
            }}
          >
            <View style={[styles.row, { gap: spacing.md }]}>
              <AppText style={styles.fill}>{t('report.includeDetails')}</AppText>
              <Switch
                value={withDetails}
                onValueChange={setWithDetails}
                accessibilityLabel={t('report.includeDetails')}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
            {(Object.entries(details) as [DetailKey, string][]).map(([key, value]) => (
              <View key={key} style={[styles.row, { gap: spacing.md }]}>
                <AppText variant="caption" tone="muted" style={styles.fill}>
                  {t(`report.detail.${key}`)}
                </AppText>
                <AppText
                  variant="caption"
                  tone={withDetails ? 'default' : 'faint'}
                  style={withDetails ? null : styles.struck}
                >
                  {value}
                </AppText>
              </View>
            ))}
          </View>
          <AppText variant="caption" tone="muted">
            {t('report.privacy')}
          </AppText>
        </View>

        {message ? (
          <AppText tone="danger" accessibilityLiveRegion="polite">
            {message}
          </AppText>
        ) : null}

        <Button
          title={busy === 'sending' ? t('report.sending') : t('report.send')}
          onPress={() => void send()}
          disabled={missing > 0 || busy !== null}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap' },
  thumbBox: { position: 'relative' },
  thumb: { width: 72, height: 144, borderWidth: 1 },
  remove: { position: 'absolute', top: -8, end: -8, width: 32, height: 32, borderRadius: 16 },
  struck: { textDecorationLine: 'line-through' },
});
