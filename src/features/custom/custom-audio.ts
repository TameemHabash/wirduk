import { Directory, File, Paths } from 'expo-file-system';

import { extensionOf, newAudioName } from './audio-files';

/**
 * The user's own audio (recorded in the app or picked from the phone).
 * Kept in the app's document folder: user data, never removed by
 * "delete downloaded audio" and never touched by content updates.
 */
const FOLDER = 'custom-audio';

function folder(): Directory {
  const dir = new Directory(Paths.document, FOLDER);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Copies a recorded or picked file into app storage. Returns its new file name. */
export async function storeCustomAudio(sourceUri: string, originalName?: string): Promise<string> {
  const name = newAudioName(extensionOf(originalName ?? sourceUri));
  await new File(sourceUri).copy(new File(folder(), name));
  return name;
}

/** A stored file (it may not exist), e.g. to save or restore it in a backup. */
export function customAudioFile(fileName: string): File {
  return new File(folder(), fileName);
}

/** Playable URI of a stored file. */
export function customAudioUri(fileName: string): string {
  return new File(folder(), fileName).uri;
}

/** Removes stored files (missing files are ignored). */
export function deleteCustomAudio(...fileNames: (string | null | undefined)[]): void {
  for (const name of fileNames) {
    if (!name) continue;
    try {
      const file = new File(folder(), name);
      if (file.exists) file.delete();
    } catch {
      // Best effort: a leftover file is harmless.
    }
  }
}
