import { useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useRepositories } from '@/data/DataProvider';
import { useAdwamuha } from '@/features/adwamuha/AdwamuhaProvider';
import { setDevClock } from '@/features/adwamuha/dev-clock';
import { type DayKey, addDays } from '@/features/adwamuha/logic/days';

/** A local time on a day. */
function at(day: DayKey, hour: number): Date {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d, hour);
}

/**
 * Dev builds only (milestone 13): `wirduk://dev-clock?days=7&hour=20&read=4` moves
 * «أدومها»'s clock `days` ahead, to `hour` (default 9), and stores the wards of the days it
 * skips (after today, before the new day) as read: `all`, `none` (default), or on the first N
 * days of each 7. Then Home. A release build ignores it and only opens Home.
 */
export default function DevClock() {
  const router = useRouter();
  const { adwamuha: repo } = useRepositories();
  const { ready, stored, slot } = useAdwamuha();
  const params = useLocalSearchParams<{ days?: string; hour?: string; read?: string }>();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !ready) return;
    done.current = true;
    if (!__DEV__) {
      router.replace('/');
      return;
    }
    void (async () => {
      const days = Math.max(0, Math.floor(Number(params.days ?? '1')) || 0);
      const hour = Math.min(23, Math.max(0, Number(params.hour ?? '9') || 0));
      const read = params.read ?? 'none';
      const perWeek = read === 'all' ? 7 : read === 'none' ? 0 : Number(read) || 0;
      const today = slot().date;
      if (stored?.enabled) {
        for (let i = 1; i < days; i++) {
          if ((i - 1) % 7 >= perWeek) continue;
          const date = addDays(today, i);
          for (const [session, h] of [
            ['morning', 7],
            ['evening', 18],
          ] as const) {
            await repo.addRecord({
              date,
              session,
              completedAt: at(date, h).getTime(),
              late: false,
              source: 'reader',
              step: stored.state.step,
            });
          }
        }
      }
      setDevClock(at(addDays(today, days), hour));
      router.replace('/');
    })();
  }, [params.days, params.hour, params.read, ready, repo, router, slot, stored]);

  return null;
}
