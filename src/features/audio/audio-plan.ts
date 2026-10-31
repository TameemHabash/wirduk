/**
 * Pure helpers for audio downloads (no React Native imports, tested in Node).
 */
import type { AudioFileInfo } from '@/data/models';

/** Room left free on the phone after a download, so it never fills up completely. */
export const STORAGE_MARGIN_BYTES = 20 * 1024 * 1024;

/**
 * What a download takes: the recordings of the morning and evening adhkar (the only one the
 * user sees; owner, 2026-10-30), or every recording of the language (kept, not shown).
 */
export type DownloadScope = 'morningEvening' | 'all';

/**
 * A recording's file name on the audio site and on the phone. The book's recordings are
 * named without their extension (`75` → `75.mp3`); the owner's keep theirs (`1001.m4a`,
 * milestone 11: published as recorded, not converted).
 */
export function audioFileName(fileName: string, defaultExtension: string): string {
  return /\.[a-z0-9]{2,4}$/i.test(fileName) ? fileName : `${fileName}.${defaultExtension}`;
}

export interface DownloadPlan {
  /** Every audio file of the language. */
  totalFiles: number;
  totalBytes: number;
  downloadedFiles: number;
  downloadedBytes: number;
  /** Files still to download, in a stable order. */
  missing: AudioFileInfo[];
  missingBytes: number;
}

export function planDownloads(
  all: readonly AudioFileInfo[],
  isDownloaded: (fileName: string) => boolean,
): DownloadPlan {
  const missing = all.filter((f) => !isDownloaded(f.fileName));
  const sum = (list: readonly AudioFileInfo[]) => list.reduce((n, f) => n + f.bytes, 0);
  const totalBytes = sum(all);
  const missingBytes = sum(missing);
  return {
    totalFiles: all.length,
    totalBytes,
    downloadedFiles: all.length - missing.length,
    downloadedBytes: totalBytes - missingBytes,
    missing,
    missingBytes,
  };
}

/** Megabytes for display: one decimal below 10 MB, whole numbers above. */
export function toMegabytes(bytes: number): number {
  const mb = bytes / (1024 * 1024);
  if (mb === 0) return 0;
  if (mb < 10) return Math.max(0.1, Math.round(mb * 10) / 10);
  return Math.round(mb);
}

/**
 * Why a download failed, for a clear message:
 * - `offline`: no connection (or the server could not be reached),
 * - `storage`: not enough free space,
 * - `failed`: anything else (bad answer from the server, damaged file),
 * - `cancelled`: the user stopped it (no message needed).
 */
export type AudioErrorKind = 'offline' | 'storage' | 'failed' | 'cancelled';

export class AudioDownloadError extends Error {
  readonly kind: AudioErrorKind;

  constructor(kind: AudioErrorKind, message?: string) {
    super(message ?? kind);
    this.name = 'AudioDownloadError';
    this.kind = kind;
  }
}

const OFFLINE_HINTS = [
  'network',
  'internet',
  'offline',
  'unable to resolve host',
  'unknownhost',
  'failed to connect',
  'connection',
  'timed out',
  'timeout',
  'socket',
];
const STORAGE_HINTS = ['no space', 'enospc', 'disk full', 'storage full', 'not enough space'];

export function classifyError(error: unknown): AudioErrorKind {
  if (error instanceof AudioDownloadError) return error.kind;
  const name = error instanceof Error ? error.name : '';
  if (name === 'AbortError') return 'cancelled';
  const text = (error instanceof Error ? `${name} ${error.message}` : String(error)).toLowerCase();
  if (STORAGE_HINTS.some((h) => text.includes(h))) return 'storage';
  if (OFFLINE_HINTS.some((h) => text.includes(h))) return 'offline';
  return 'failed';
}

export function isAborted(signal?: AbortSignal): boolean {
  return signal?.aborted === true;
}

/**
 * Runs `worker` on every item, at most `limit` at a time. Stops starting new
 * items once `signal` is aborted or a worker fails; the first failure is
 * thrown after the running ones end.
 */
export async function runPool<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>,
  signal?: AbortSignal,
): Promise<void> {
  let next = 0;
  let failure: unknown = null;
  const lane = async () => {
    while (failure === null && !isAborted(signal) && next < items.length) {
      const item = items[next++] as T;
      try {
        await worker(item);
      } catch (e) {
        if (failure === null) failure = e;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, lane));
  if (failure !== null) throw failure;
  if (isAborted(signal)) throw new AudioDownloadError('cancelled');
}
