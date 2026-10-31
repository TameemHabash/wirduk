import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as SQLite from 'expo-sqlite';

import { BackupError, type BackupSummary, type Recording } from '@/data/backup/backup-db';
import { fromExpoDatabase } from '@/data/db/expo-sql';
import { removeDatabaseFiles, sqliteFile, sqlitePath } from '@/data/db/open-databases';
import type { BackupRepository } from '@/data/repositories/backup-repository';
import { dayKeyOf } from '@/features/adwamuha/logic/days';
import { customAudioFile } from '@/features/custom/custom-audio';

/**
 * The backup file on the phone (milestone 12): made in the SQLite folder,
 * handed to the share sheet from the cache folder; a picked file is checked
 * in the SQLite folder before anything is replaced.
 */
const OUT = 'backup-out.db';
const IN = 'backup-in.db';
/** The data as it was before the last restore (kept on the phone, just in case). */
const BEFORE_RESTORE = 'user-before-restore.db';

export const BACKUP_EXTENSION = 'wirduk';

/** A work database in the SQLite folder, as one plain file (no WAL beside it). */
async function openWork(name: string) {
  const db = fromExpoDatabase(await SQLite.openDatabaseAsync(name));
  try {
    await db.exec('PRAGMA journal_mode = DELETE');
  } catch (e) {
    await db.close().catch(() => undefined);
    throw e;
  }
  return db;
}

export interface MadeBackup {
  uri: string;
  name: string;
  bytes: number;
  summary: BackupSummary;
}

/** Makes the backup file: the user's data and their own recordings. */
export async function makeBackupFile(
  repo: BackupRepository,
  now = Date.now(),
): Promise<MadeBackup> {
  await removeDatabaseFiles(OUT);
  await repo.copyTo(sqlitePath(OUT));
  const recordings: Recording[] = [];
  for (const name of await repo.recordingNames()) {
    const file = customAudioFile(name);
    if (file.exists) recordings.push({ name, bytes: await file.bytes() });
  }
  const copy = await openWork(OUT);
  let summary: BackupSummary;
  try {
    summary = await repo.prepare(
      copy,
      { createdAt: now, appVersion: Constants.expoConfig?.version ?? '' },
      recordings,
    );
  } finally {
    await copy.close();
  }
  const target = new File(
    Paths.cache,
    `wirduk-backup-${dayKeyOf(new Date(now))}.${BACKUP_EXTENSION}`,
  );
  if (target.exists) target.delete();
  await sqliteFile(OUT).move(target);
  await removeDatabaseFiles(OUT);
  return { uri: target.uri, name: target.name, bytes: target.size ?? 0, summary };
}

/** Opens the share sheet (Google Drive, Files, WhatsApp…) for the file. */
export async function shareBackupFile(uri: string, dialogTitle: string): Promise<void> {
  await Sharing.shareAsync(uri, {
    mimeType: 'application/octet-stream',
    UTI: 'public.data',
    dialogTitle,
  });
}

/**
 * Lets the user pick a backup file and checks it (an older one is brought up
 * to date). Null when the picker was closed. Throws a BackupError.
 */
export async function pickBackupFile(repo: BackupRepository): Promise<BackupSummary | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  const picked = result.canceled ? undefined : result.assets[0];
  if (!picked) return null;
  await removeDatabaseFiles(IN);
  await new File(picked.uri).copy(sqliteFile(IN));
  let copy: Awaited<ReturnType<typeof openWork>>;
  try {
    copy = await openWork(IN);
  } catch (e) {
    // Not a database at all.
    throw new BackupError('not-backup', e instanceof Error ? e.message : String(e));
  }
  try {
    return await repo.open(copy);
  } catch (e) {
    throw e instanceof BackupError
      ? e
      : new BackupError('not-backup', e instanceof Error ? e.message : String(e));
  } finally {
    await copy.close();
  }
}

/**
 * Replaces the user's data with the picked backup (see `pickBackupFile`):
 * a safety copy of the current data first, then the recordings, then the data
 * in one transaction. Restart the app afterwards (`useRestartApp`).
 */
export async function restorePickedBackup(
  repo: BackupRepository,
  summary: BackupSummary,
): Promise<void> {
  await removeDatabaseFiles(BEFORE_RESTORE);
  await repo.copyTo(sqlitePath(BEFORE_RESTORE));

  // New files only: if the next step fails, nothing the user had is lost.
  const copy = await openWork(IN);
  try {
    for (const r of await repo.recordings(copy)) {
      const file = customAudioFile(r.name);
      if (!file.exists) file.create();
      file.write(r.bytes);
    }
  } finally {
    await copy.close();
  }

  await repo.restore(sqlitePath(IN));
  await repo.setFileSavedAt(summary.createdAt);
  await removeDatabaseFiles(IN);
}

/** Removes a picked file that was not restored. */
export async function discardPickedBackup(): Promise<void> {
  await removeDatabaseFiles(IN);
}
