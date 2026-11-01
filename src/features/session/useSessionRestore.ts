import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/Toast';
import { isCustomId } from '@/data/custom-ids';
import { useRepositories } from '@/data/DataProvider';
import { isFresh } from '@/data/session';
import { useSettings } from '@/data/settings/SettingsProvider';
import { counterStore } from '@/features/counter/counter-store';
import { startupFromNotification } from '@/features/reminders/useReminders';

/** Restored at most once per app start (Home can mount again later). */
const state = { checked: false };

/**
 * A new app start: the root layout calls it when it mounts (tests: before each case). Android
 * can start the app again in a process it kept (after a swipe from the recent apps, once the
 * audio has played): the screens start again from Home, but this module's state stays.
 */
export function newAppStart(): void {
  state.checked = false;
  startupFromNotification.opened = false;
}

/** How long the "last state restored" toast stays: it has more to read. */
export const RESTORED_TOAST_MS = 6000;

/**
 * "Continue where I stopped": on app start, reopens the reader where the user
 * was when the app went to the background, with the same counts, if that was
 * at most 5 hours ago and the setting is on. The saved state is always
 * removed once read. Used by the Home screen (the first screen).
 */
export function useSessionRestore(): void {
  const { session, content, custom } = useRepositories();
  const { settings } = useSettings();
  const router = useRouter();
  const toast = useToast();
  const { t, i18n } = useTranslation();
  const enabled = settings.restoreSession;
  const lang = i18n.language;

  useEffect(() => {
    if (state.checked) return;
    state.checked = true;
    const run = async () => {
      const saved = await session.load();
      await session.clear();
      // The app was opened by a tap on a reminder: that one opens its own adhkar.
      if (startupFromNotification.opened) return;
      if (!saved || !enabled || !isFresh(saved, Date.now())) return;
      const adhkar = isCustomId(saved.categoryId)
        ? await custom.listAdhkar(saved.categoryId)
        : await content.listAdhkar(saved.categoryId, lang);
      // The category or the dhikr may be gone (own adhkar deleted, content changed).
      if (!adhkar.some((d) => d.id === saved.dhikrId)) return;
      counterStore.restore(adhkar, saved.counts);
      if (saved.ward) {
        // An Adwamuha ward: its adhkar are in the morning / evening category.
        router.push({
          pathname: '/adwamuha/ward/[session]',
          params: { session: saved.ward, dhikr: String(saved.dhikrId) },
        });
      } else {
        router.push({
          pathname: '/category/[id]',
          params: { id: String(saved.categoryId), dhikr: String(saved.dhikrId) },
        });
      }
      toast.show({
        message: t('settings.restored'),
        onPress: () => router.push('/settings'),
        durationMs: RESTORED_TOAST_MS,
      });
    };
    run().catch(() => undefined);
  }, [content, custom, enabled, lang, router, session, t, toast]);
}
