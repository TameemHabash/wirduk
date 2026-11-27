import { useMemo } from 'react';

import { useRepositories } from '@/data/DataProvider';
import { deleteCustomAudio } from '@/features/custom/services/custom-audio';
import { counterStore } from '@/features/reader/state/counter-store';

/**
 * Deleting the user's own chapters and adhkar, with everything that goes with them: the
 * recordings on the phone, the favorite, the counts kept in memory. They throw when the
 * database refuses (the screen shows the error).
 */
export function useCustomActions() {
  const { custom, favorites } = useRepositories();
  return useMemo(
    () => ({
      /** A chapter and its adhkar (`dhikrIds`: their counts are dropped). */
      async deleteCategory(id: number, dhikrIds: readonly number[]): Promise<void> {
        const { audioFiles } = await custom.deleteCategory(id);
        deleteCustomAudio(...audioFiles);
        await favorites.remove(id);
        counterStore.resetMany(dhikrIds);
      },
      /** A dhikr; `unsavedAudio`: a recording made on the editor and not saved yet. */
      async deleteDhikr(id: number, unsavedAudio: string | null): Promise<void> {
        const { audioFile } = await custom.deleteDhikr(id);
        deleteCustomAudio(audioFile, unsavedAudio);
        counterStore.reset(id);
      },
    }),
    [custom, favorites],
  );
}
