/**
 * "Continue where I stopped" (setting, on by default; owner decision 2026-10-22).
 *
 * When the app goes to the background while the reader is open, the reader's
 * place and counts are saved. If the app is then closed (or killed by the
 * system) and opened again within 5 hours, the reader opens there again with
 * the same counts. After 5 hours the app starts fresh.
 */

/** A saved state is used for at most 5 hours. */
export const SESSION_MAX_AGE_MS = 5 * 60 * 60 * 1000;

export interface ReaderSession {
  categoryId: number;
  /** The dhikr that was on screen. */
  dhikrId: number;
  /** Counts of that category's adhkar (only those above 0), by dhikr id. */
  counts: Record<string, number>;
  /** Set when it was an Adwamuha ward (its adhkar are in `categoryId`): reopens the ward. */
  ward?: 'morning' | 'evening';
}

export interface SavedSession extends ReaderSession {
  savedAt: number;
}

/** True when the saved state may be restored at `now`. */
export function isFresh(session: SavedSession, now: number): boolean {
  const age = now - session.savedAt;
  // A clock moved back a lot makes the age negative: treat it as too old.
  return age >= -60_000 && age <= SESSION_MAX_AGE_MS;
}

/** Parses stored JSON; anything malformed is ignored (null). */
export function parseSession(json: string, savedAt: number): SavedSession | null {
  try {
    const v = JSON.parse(json) as Partial<ReaderSession>;
    if (!Number.isInteger(v.categoryId) || v.categoryId === 0) return null;
    if (!Number.isInteger(v.dhikrId) || v.dhikrId === 0) return null;
    if (typeof v.counts !== 'object' || v.counts === null) return null;
    const counts: Record<string, number> = {};
    for (const [id, n] of Object.entries(v.counts)) {
      if (Number.isInteger(Number(id)) && Number.isInteger(n) && n > 0) counts[id] = n;
    }
    const ward = v.ward === 'morning' || v.ward === 'evening' ? v.ward : undefined;
    return {
      categoryId: v.categoryId!,
      dhikrId: v.dhikrId!,
      counts,
      ...(ward ? { ward } : {}),
      savedAt,
    };
  } catch {
    return null;
  }
}
