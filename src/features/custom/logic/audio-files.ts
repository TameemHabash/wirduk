/**
 * Rules for the user's own audio files (pure: no file system here).
 * Storage itself is in custom-audio.ts.
 */

/** Largest audio file the user can pick. */
export const MAX_PICKED_AUDIO_BYTES = 50 * 1024 * 1024;

/** Formats that play on Android and iOS. */
const PLAYABLE_EXTENSIONS = new Set([
  'm4a',
  'mp3',
  'aac',
  'wav',
  'caf',
  'mp4',
  '3gp',
  'amr',
  'flac',
]);

/** Lower-case extension of a file name or URI, without the dot ("" if none). */
export function extensionOf(nameOrUri: string): string {
  const clean = nameOrUri.split(/[?#]/)[0] ?? '';
  const base = clean.split('/').pop() ?? '';
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : '';
}

/** True if a picked file looks like audio we can play on both platforms. */
export function isPlayableAudio(name: string, mimeType?: string | null): boolean {
  const ext = extensionOf(name);
  if (PLAYABLE_EXTENSIONS.has(ext)) return true;
  // No usable extension: trust the type, except formats iOS cannot play.
  return !ext && !!mimeType && mimeType.startsWith('audio/') && !/ogg|opus|webm/.test(mimeType);
}

/** A new unique file name, keeping the extension (m4a when unknown). */
export function newAudioName(ext: string, now = Date.now(), random = Math.random()): string {
  const safe = /^[a-z0-9]{1,5}$/.test(ext) ? ext : 'm4a';
  return `a-${now.toString(36)}-${Math.floor(random * 36 ** 6).toString(36)}.${safe}`;
}

/** "1:05" from milliseconds. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
