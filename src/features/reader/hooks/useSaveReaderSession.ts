import { type RefObject, useEffect } from 'react';
import { AppState } from 'react-native';

import { useRepositories } from '@/data/DataProvider';
import type { Dhikr } from '@/data/models';
import { counterStore } from '@/features/reader/state/counter-store';

/**
 * "Continue where I stopped" (setting): saves the place and the counts when the app goes to the
 * background, and forgets them when it comes back (still in memory).
 */
export function useSaveReaderSession({
  enabled,
  categoryId,
  adhkar,
  indexRef,
  ward,
}: {
  enabled: boolean;
  categoryId: number;
  adhkar: Dhikr[];
  /** The page shown now. */
  indexRef: RefObject<number>;
  /** «أدومها»'s ward: "continue where I stopped" reopens the ward, not the category. */
  ward?: 'morning' | 'evening';
}): void {
  const { session } = useRepositories();
  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        const counts: Record<string, number> = {};
        for (const d of adhkar) {
          const n = counterStore.get(d.id);
          if (n > 0) counts[String(d.id)] = n;
        }
        const dhikr = adhkar[indexRef.current] ?? adhkar[0]!;
        void session
          .save({ categoryId, dhikrId: dhikr.id, counts, ...(ward ? { ward } : {}) })
          .catch(() => undefined);
      } else if (state === 'active') {
        void session.clear().catch(() => undefined);
      }
    });
    return () => sub.remove();
  }, [adhkar, categoryId, enabled, indexRef, session, ward]);
}
