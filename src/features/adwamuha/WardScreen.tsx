import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { useToast } from '@/components/Toast';
import { APP_CONFIG } from '@/config/app-config';
import { useRepositories } from '@/data/DataProvider';
import type { Category, Dhikr } from '@/data/models';
import { useSettings } from '@/data/settings/SettingsProvider';
import { counterStore } from '@/features/counter/counter-store';
import { Reader } from '@/features/reader/ReaderScreen';
import { useAppTheme } from '@/theme/ThemeProvider';

import { useAdwamuha } from './AdwamuhaProvider';
import { closedWardText } from './closed-ward';
import { type Session, recordSlot } from './logic/sessions';
import { orderWard } from './logic/ward';
import { latestWriter } from './ward-progress';

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
// It can be read in parts: its counts are kept while its window is open (`ward-progress.ts`).
export function WardScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ session: string; dhikr?: string }>();
  const session: Session = params.session === 'evening' ? 'evening' : 'morning';
  const adwamuha = useAdwamuha();
  const { content, adwamuha: repo } = useRepositories();
  const categoryId = categoryOfSession(session);
  const { wardOrder: order, wardTimes } = useSettings().settings;

  // The ward's window open now. Its counts are kept for that window (owner, 2026-11-14: read in
  // parts, a new ward each day). Outside it the ward does not open (owner, 2026-11-21): back to
  // Home with a note (e.g. Home was left open on the morning ward until the evening began). A
  // ward opened in its window stays open after it; finished then, it just does not count.
  const [windowDate] = useState(() => recordSlot(session, adwamuha.now(), wardTimes)?.date ?? null);
  const toast = useToast();
  const leaving = useRef(false);
  useEffect(() => {
    if (windowDate !== null || leaving.current) return;
    leaving.current = true;
    toast.show({ message: closedWardText(t, session, 'over', wardTimes) });
    router.dismissTo('/');
  }, [router, session, t, toast, wardTimes, windowDate]);
  const keep = useMemo(
    () =>
      windowDate === null
        ? null
        : latestWriter((counts) =>
            counts === null
              ? repo.clearWardProgress(session)
              : repo.saveWardProgress(session, windowDate, counts),
          ),
    [repo, session, windowDate],
  );

  // The ward's ids as a key: a new array with the same ids changes nothing.
  const idsKey = adwamuha.wardIds(session).join(',');
  const [adhkar, setAdhkar] = useState<Dhikr[] | null>(null);
  useEffect(() => {
    if (!adwamuha.ready || !idsKey || windowDate === null) return;
    let cancelled = false;
    const ids = idsKey.split(',').map(Number);
    Promise.all([
      content.listAdhkar(categoryId, i18n.language),
      repo.loadWardProgress(session, windowDate).catch(() => ({})),
    ])
      .then(([all, kept]) => {
        if (cancelled) return;
        const byId = new Map(all.map((d) => [d.id, d]));
        const ordered = orderWard(
          ids,
          order,
          all.map((d) => d.id),
        );
        const list = ordered.map((id) => byId.get(id)).filter((d): d is Dhikr => d !== undefined);
        // Where the user stopped earlier in this window: the reader opens at the first open dhikr.
        counterStore.restore(list, kept);
        setAdhkar(list);
      })
      .catch(() => !cancelled && setAdhkar([]));
    return () => {
      cancelled = true;
    };
  }, [
    adwamuha.ready,
    categoryId,
    content,
    i18n.language,
    idsKey,
    order,
    repo,
    session,
    windowDate,
  ]);

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
    // Read to the end: nothing more to keep (opening it again starts from the beginning).
    keep?.(null);
    void completeWard(session)
      .catch(() => null)
      .then((record) =>
        router.replace({
          pathname: '/adwamuha/ward/[session]/done',
          params: { session, counted: record ? '1' : '0' },
        }),
      );
  }, [completeWard, keep, router, session]);

  if (windowDate === null) {
    return <View style={[styles.fill, { backgroundColor: colors.background }]} />;
  }
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
      onCountsChange={keep ?? undefined}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
