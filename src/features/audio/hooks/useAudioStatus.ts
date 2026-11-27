import { useMemo } from 'react';

import {
  type DownloadPlan,
  type DownloadScope,
  withDownloaded,
} from '@/features/audio/logic/audio-plan';
import { scopeCategories, useAudio } from '@/features/audio/state/AudioProvider';
import { useAsync } from '@/hooks/useAsync';

/**
 * What is downloaded and what is missing, of the morning and evening recordings
 * (the download the user sees) or of all of them; read again whenever files change. While a
 * download of the same recordings runs, the files it finished count at once (without reading
 * the phone again for each one).
 */
export function useAudioStatus(scope: DownloadScope = 'morningEvening'): DownloadPlan | null {
  const { downloads, lang, changes, downloadAll } = useAudio();
  const read = useAsync<DownloadPlan | null>(
    () => downloads.status(lang, scopeCategories(scope)),
    // `changes` counts file changes: each new value reads the status again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [downloads, lang, changes, scope],
    null,
  );
  const running =
    downloadAll.phase === 'running' && downloadAll.scope === scope ? downloadAll.progress : null;
  return useMemo(
    () => (read && running ? withDownloaded(read, running.doneNames) : read),
    [read, running],
  );
}
