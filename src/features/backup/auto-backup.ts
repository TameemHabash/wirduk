import { requireOptionalNativeModule } from 'expo';

import { BACKUP_NOTE_DAYS } from './backup-note';

interface WirdukBackupNative {
  lastAutoBackupAt(): number | null;
  openBackupSettings(): Promise<'backup' | 'settings' | 'none'>;
}

/** modules/wirduk-backup (Android only; null on iOS and in tests). */
const native = requireOptionalNativeModule<WirdukBackupNative>('WirdukBackup');

/** The phone can tell when it last backed the app up (Android's automatic backup). */
export const autoBackupKnown = native !== null;

/**
 * When Android last backed the app's data up to the user's Google Drive (ms
 * since 1970), or null: never on this install, backup turned off, or not
 * Android. An app cannot ask Android whether backup is on.
 */
export function lastAutoBackupAt(): number | null {
  try {
    return native?.lastAutoBackupAt() ?? null;
  } catch {
    return null;
  }
}

/**
 * Android's automatic backup looks off: it never backed the app up, or not for
 * 30 days (owner, 2026-10-25). Off and "not yet" look the same to an app.
 */
export function autoBackupLooksOff(at: number | null, now = Date.now()): boolean {
  return at === null || now - at >= BACKUP_NOTE_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Opens the phone's backup settings (stock Android's screen, or the main
 * Settings on a phone without it), so the user can turn backup on.
 */
export async function openBackupSettings(): Promise<'backup' | 'settings' | 'none'> {
  try {
    return (await native?.openBackupSettings()) ?? 'none';
  } catch {
    return 'none';
  }
}
