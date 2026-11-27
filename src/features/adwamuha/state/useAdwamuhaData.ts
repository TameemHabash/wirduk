import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useRepositories } from '@/data/DataProvider';
import type { MessagePick, WardRecord } from '@/data/models';
import type {
  AdwamuhaEvent,
  AdwamuhaStored,
  StoredPause,
} from '@/data/repositories/adwamuha-repository';

import { onDevClock } from './dev-clock';

/** Everything «أدومها» keeps in user.db. */
export interface AdwamuhaData {
  stored: AdwamuhaStored | null;
  records: WardRecord[];
  pauses: StoredPause[];
  events: AdwamuhaEvent[];
  /** Keys of the messages already shown. */
  shown: ReadonlySet<string>;
  /** The message each occasion of a moment got, the latest first. */
  picks: (MessagePick & { moment: string })[];
}

const EMPTY: AdwamuhaData = {
  stored: null,
  records: [],
  pauses: [],
  events: [],
  shown: new Set(),
  picks: [],
};

/**
 * Reads «أدومها»'s data at start, and again when the app comes back on screen (maybe the next
 * day, so everything is worked out for now) or the dev clock moves (dev builds only).
 * `ready`: the first read is over (also when it failed: the feature then looks off).
 */
export function useAdwamuhaData(): {
  ready: boolean;
  data: AdwamuhaData;
  reload: () => Promise<void>;
} {
  const { adwamuha: repo } = useRepositories();
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AdwamuhaData>(EMPTY);

  const readAll = useCallback(async (): Promise<AdwamuhaData> => {
    const [s, r, p, e, k, m] = await Promise.all([
      repo.load(),
      repo.listRecords(),
      repo.listPauses(),
      repo.listEvents(),
      repo.listShown(),
      repo.listAllPicks(),
    ]);
    return { stored: s, records: r, pauses: p, events: e, shown: new Set(k), picks: m };
  }, [repo]);
  const reload = useCallback(async () => {
    setData(await readAll());
    setReady(true);
  }, [readAll]);

  useEffect(() => {
    let cancelled = false;
    readAll()
      .then((loaded) => {
        if (cancelled) return;
        setData(loaded);
        setReady(true);
      })
      .catch(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, [readAll]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void reload().catch(() => undefined);
    });
    return () => sub.remove();
  }, [reload]);
  useEffect(() => onDevClock(() => void reload().catch(() => undefined)), [reload]);

  return { ready, data, reload };
}
