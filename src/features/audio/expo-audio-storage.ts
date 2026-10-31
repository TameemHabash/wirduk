import { Directory, File, Paths } from 'expo-file-system';

import { APP_CONFIG } from '@/config/app-config';

import type { AudioStorage } from './audio-downloads';
import { audioFileName } from './audio-plan';

/**
 * Downloaded adhkar recordings, in the app's document folder:
 * `audio/<lang>/<file>.mp3` (or `<file>` when the name has its own extension,
 * `1001.m4a`). A download is written to `<name>.part` first and renamed only
 * when complete, so a cut download never looks like a real file. (The user's
 * own audio lives in `custom-audio/`.)
 */
const FOLDER = 'audio';
const PART = '.part';

function langDir(lang: string): Directory {
  return new Directory(Paths.document, FOLDER, lang);
}

function audioFile(lang: string, fileName: string): File {
  return new File(langDir(lang), audioFileName(fileName, APP_CONFIG.audio.extension));
}

function deleteQuietly(entry: File | Directory): void {
  try {
    if (entry.exists) entry.delete();
  } catch {
    // Best effort: a leftover file is harmless and is checked by size later.
  }
}

export const expoAudioStorage: AudioStorage = {
  fileSize(lang, fileName) {
    const file = audioFile(lang, fileName);
    return file.exists ? file.size : 0;
  },

  uri(lang, fileName) {
    return audioFile(lang, fileName).uri;
  },

  async download(url, lang, fileName, signal) {
    const dir = langDir(lang);
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const target = audioFile(lang, fileName);
    const part = new File(dir, `${target.name}${PART}`);
    deleteQuietly(part);
    try {
      await File.createDownloadTask(url, part, { signal }).downloadAsync();
    } catch (e) {
      deleteQuietly(part);
      throw e;
    }
    deleteQuietly(target);
    // After this, `part` points at the final file (move updates its URI).
    await part.move(target);
  },

  remove(lang, fileName) {
    deleteQuietly(audioFile(lang, fileName));
  },

  removeAll(lang) {
    deleteQuietly(langDir(lang));
  },

  removeUnfinished(lang) {
    const dir = langDir(lang);
    if (!dir.exists) return;
    for (const entry of dir.list()) {
      if (entry instanceof File && entry.name.endsWith(PART)) deleteQuietly(entry);
    }
  },

  freeBytes() {
    return Paths.availableDiskSpace;
  },
};
