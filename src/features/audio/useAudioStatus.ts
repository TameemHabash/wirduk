import { useEffect, useState } from 'react';

import type { DownloadPlan, DownloadScope } from './audio-plan';
import { scopeCategories, useAudio } from './AudioProvider';

/**
 * What is downloaded and what is missing, of the morning and evening recordings
 * (the download the user sees) or of all of them; refreshed whenever files change.
 */
export function useAudioStatus(scope: DownloadScope = 'morningEvening'): DownloadPlan | null {
  const { downloads, lang, changes } = useAudio();
  const [plan, setPlan] = useState<DownloadPlan | null>(null);

  useEffect(() => {
    let cancelled = false;
    downloads
      .status(lang, scopeCategories(scope))
      .then((p) => {
        if (!cancelled) setPlan(p);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [downloads, lang, changes, scope]);

  return plan;
}
