import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { APP_CONFIG } from '@/config/app-config';
import { useRepositories } from '@/data/DataProvider';
import type { Category, Dhikr } from '@/data/models';
import { useSettings } from '@/data/settings/SettingsProvider';
import { Reader } from '@/features/reader/ReaderScreen';
import { useAppTheme } from '@/theme/ThemeProvider';

import { useAdwamuha } from './AdwamuhaProvider';
import type { Session } from './logic/sessions';
import { orderWard } from './logic/ward';

export const categoryOfSession = (session: Session) =>
  session === 'morning'
    ? APP_CONFIG.content.morningCategoryId
    : APP_CONFIG.content.eveningCategoryId;

/**
 * Adwamuha: the morning or evening ward in the usual reader (same counting,
 * audio, fonts, «إتمام»). There is no «read the rest» here (owner): the ward is
 * the whole reading for today. The ward is read in the order the user chose
 * («ترتيب الورد»: the plan's, or the category's).
 */
export function WardScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ session: string; dhikr?: string }>();
  const session: Session = params.session === 'evening' ? 'evening' : 'morning';
  const adwamuha = useAdwamuha();
  const { content } = useRepositories();
  const categoryId = categoryOfSession(session);
  const order = useSettings().settings.wardOrder;

  // The ward's ids as a key: a new array with the same ids changes nothing.
  const idsKey = adwamuha.wardIds(session).join(',');
  const [adhkar, setAdhkar] = useState<Dhikr[] | null>(null);
  useEffect(() => {
    if (!adwamuha.ready || !idsKey) return;
    let cancelled = false;
    const ids = idsKey.split(',').map(Number);
    content
      .listAdhkar(categoryId, i18n.language)
      .then((all) => {
        if (cancelled) return;
        const byId = new Map(all.map((d) => [d.id, d]));
        const ordered = orderWard(
          ids,
          order,
          all.map((d) => d.id),
        );
        setAdhkar(ordered.map((id) => byId.get(id)).filter((d): d is Dhikr => d !== undefined));
      })
      .catch(() => !cancelled && setAdhkar([]));
    return () => {
      cancelled = true;
    };
  }, [adwamuha.ready, categoryId, content, i18n.language, idsKey, order]);

  const title = t(`adwamuha.wardTitle.${session}`);
  const category = useMemo<Category>(
    () => ({
      id: categoryId,
      title,
      defaultOrder: 0,
      adhkarCount: adhkar?.length ?? 0,
      custom: false,
    }),
    [adhkar?.length, categoryId, title],
  );

  const { completeWard } = adwamuha;
  const onFinished = useCallback(() => {
    void completeWard(session)
      .catch(() => null)
      .then((record) =>
        router.replace({
          pathname: '/adwamuha/ward/[session]/done',
          params: { session, counted: record ? '1' : '0' },
        }),
      );
  }, [completeWard, router, session]);

  if (adwamuha.ready && !idsKey) {
    return (
      <SafeAreaView style={[styles.fill, styles.center, { backgroundColor: colors.background }]}>
        <AppText tone="muted">{t('adwamuha.notOn')}</AppText>
      </SafeAreaView>
    );
  }
  if (!adhkar || adhkar.length === 0) {
    return <View style={[styles.fill, { backgroundColor: colors.background }]} />;
  }
  return (
    <Reader
      key={`${session}:${adhkar.map((d) => d.id).join(',')}`}
      category={category}
      adhkar={adhkar}
      startDhikrId={params.dhikr ? Number(params.dhikr) : undefined}
      onFinished={onFinished}
      ward={session}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
