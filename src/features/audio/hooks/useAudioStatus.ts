import type { DownloadPlan, DownloadScope } from '@/features/audio/logic/audio-plan';
import { scopeCategories, useAudio } from '@/features/audio/state/AudioProvider';
import { useAsync } from '@/hooks/useAsync';

/**
 * What is downloaded and what is missing, of the morning and evening recordings
 * (the download the user sees) or of all of them; refreshed whenever files change.
 */
export function useAudioStatus(scope: DownloadScope = 'morningEvening'): DownloadPlan | null {
  const { downloads, lang, changes } = useAudio();
  return useAsync<DownloadPlan | null>(
    () => downloads.status(lang, scopeCategories(scope)),
    // `changes` counts file changes: each new value reads the status again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [downloads, lang, changes, scope],
    null,
  );
}
