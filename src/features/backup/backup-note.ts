/** Days without any backup before the gentle note on Home (owner, 2026-10-25). */
export const BACKUP_NOTE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface BackupNoteInput {
  now: number;
  /** When the data worth saving began (Adwamuha, own adhkar), or null when there is none. */
  dataSince: number | null;
  /** Android's own automatic backup (null: never, turned off, or not Android). */
  lastAutoBackupAt: number | null;
  /** The last backup file made. */
  fileSavedAt: number | null;
  /** The note was last shown. */
  noteShownAt: number | null;
}

/**
 * The note shows when the user has data worth saving and nothing saved it for
 * 30 days: no automatic backup (never, or over 30 days ago: an app cannot ask
 * Android whether backup is on) and no backup file. Once shown, not again for
 * 30 days.
 */
export function shouldShowBackupNote(input: BackupNoteInput): boolean {
  if (input.dataSince === null) return false;
  const lastSafe = Math.max(input.dataSince, input.lastAutoBackupAt ?? 0, input.fileSavedAt ?? 0);
  if (input.now - lastSafe < BACKUP_NOTE_DAYS * DAY_MS) return false;
  return input.noteShownAt === null || input.now - input.noteShownAt >= BACKUP_NOTE_DAYS * DAY_MS;
}
