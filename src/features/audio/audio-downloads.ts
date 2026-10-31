/**
 * Downloads the adhkar recordings and keeps track of them.
 *
 * - One file: downloaded the first time it is played, then always played
 *   from the phone. Two requests for the same file share one download.
 * - "Download all": only the current language (and, when given, only the
 *   adhkar of some categories: the morning and evening download), skips what
 *   is already there, a few files at a time, can be cancelled, and simply
 *   continues where it stopped when started again (finished files are never
 *   downloaded twice).
 * - A file counts as downloaded only if it is on the phone with its full
 *   size; the registry in user.db is corrected when it disagrees.
 *
 * No React Native imports: storage is passed in (expo-file-system in the
 * app, a fake in tests).
 */
import type { AudioFileInfo, DownloadedAudio } from '@/data/models';

import {
  AudioDownloadError,
  audioFileName,
  classifyError,
  type DownloadPlan,
  planDownloads,
  runPool,
  STORAGE_MARGIN_BYTES,
} from './audio-plan';

/** Files on the phone. Downloads must be atomic: a cut download leaves no file. */
export interface AudioStorage {
  /** Size of the complete file, or 0 when it is not there. */
  fileSize(lang: string, fileName: string): number;
  uri(lang: string, fileName: string): string;
  download(url: string, lang: string, fileName: string, signal?: AbortSignal): Promise<void>;
  remove(lang: string, fileName: string): void;
  removeAll(lang: string): void;
  /** Deletes half-written files left by an interrupted download. */
  removeUnfinished(lang: string): void;
  freeBytes(): number;
}

/** What the app knows it has downloaded (DownloadedAudioRepository). */
export interface AudioRegistry {
  list(lang: string): Promise<DownloadedAudio[]>;
  save(lang: string, fileName: string, bytes: number): Promise<void>;
  remove(lang: string, fileName: string): Promise<void>;
  removeAll(lang?: string): Promise<void>;
}

/** Which files exist and their sizes (ContentRepository). */
export interface AudioCatalog {
  /** Every file of the language, or only those of the adhkar of `categoryIds`. */
  listAudioFiles(lang: string, categoryIds?: readonly number[]): Promise<AudioFileInfo[]>;
  getAudioFile(lang: string, fileName: string): Promise<AudioFileInfo | null>;
}

export interface AudioDownloadsOptions {
  storage: AudioStorage;
  registry: AudioRegistry;
  catalog: AudioCatalog;
  /**
   * A file's URL is `${baseUrl}/${lang}/${fileName}.${extension}`, or `${baseUrl}/${lang}/${fileName}`
   * when the name has its own extension (`1001.m4a`).
   */
  baseUrl: string;
  extension: string;
  maxParallel: number;
}

export interface DownloadAllProgress {
  doneFiles: number;
  totalFiles: number;
  doneBytes: number;
  totalBytes: number;
}

export class AudioDownloads {
  private readonly o: AudioDownloadsOptions;
  private readonly inFlight = new Map<string, Promise<string>>();

  constructor(options: AudioDownloadsOptions) {
    this.o = options;
  }

  url(lang: string, fileName: string): string {
    return `${this.o.baseUrl}/${lang}/${encodeURIComponent(audioFileName(fileName, this.o.extension))}`;
  }

  /** Local URI of a complete downloaded file, or null. */
  async localUri(lang: string, fileName: string): Promise<string | null> {
    const info = await this.o.catalog.getAudioFile(lang, fileName);
    if (!info) return null;
    return this.isComplete(info) ? this.o.storage.uri(lang, fileName) : null;
  }

  /**
   * Returns the local URI of the file, downloading it first if needed.
   * Throws an AudioDownloadError.
   */
  ensure(lang: string, fileName: string, signal?: AbortSignal): Promise<string> {
    const key = `${lang}/${fileName}`;
    const running = this.inFlight.get(key);
    if (running) return running;
    const job = this.ensureOne(lang, fileName, signal).finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, job);
    return job;
  }

  /**
   * What is downloaded and what is missing (of the adhkar of `categoryIds`, when given).
   * Corrects the registry on the way.
   */
  async status(lang: string, categoryIds?: readonly number[]): Promise<DownloadPlan> {
    const [all, registered] = await Promise.all([
      this.o.catalog.listAudioFiles(lang, categoryIds),
      this.o.registry.list(lang),
    ]);
    const complete = new Set(all.filter((f) => this.isComplete(f)).map((f) => f.fileName));
    const plan = planDownloads(all, (name) => complete.has(name));
    // Registry rows whose file is gone (deleted by the system, cut download).
    const missing = new Set(plan.missing.map((f) => f.fileName));
    await Promise.all(
      registered
        .filter((r) => missing.has(r.fileName))
        .map((r) => this.o.registry.remove(lang, r.fileName)),
    );
    // Complete files the registry does not know (e.g. the app closed right after a download).
    const known = new Set(registered.map((r) => r.fileName));
    await Promise.all(
      all
        .filter((f) => !missing.has(f.fileName) && !known.has(f.fileName))
        .map((f) => this.o.registry.save(lang, f.fileName, f.bytes)),
    );
    return plan;
  }

  /**
   * Downloads every missing file of the language (of the adhkar of `categoryIds`, when
   * given). Calls `onProgress` after each file. Throws an AudioDownloadError (kind
   * `cancelled` when stopped).
   */
  async downloadAll(
    lang: string,
    {
      signal,
      onProgress,
      categoryIds,
    }: {
      signal?: AbortSignal;
      onProgress?: (p: DownloadAllProgress) => void;
      categoryIds?: readonly number[];
    },
  ): Promise<DownloadPlan> {
    this.o.storage.removeUnfinished(lang);
    const plan = await this.status(lang, categoryIds);
    if (plan.missing.length === 0) return plan;
    if (this.o.storage.freeBytes() < plan.missingBytes + STORAGE_MARGIN_BYTES) {
      throw new AudioDownloadError('storage');
    }
    const progress: DownloadAllProgress = {
      doneFiles: 0,
      totalFiles: plan.missing.length,
      doneBytes: 0,
      totalBytes: plan.missingBytes,
    };
    onProgress?.({ ...progress });
    try {
      await runPool(
        plan.missing,
        this.o.maxParallel,
        async (file) => {
          await this.ensure(lang, file.fileName, signal);
          progress.doneFiles += 1;
          progress.doneBytes += file.bytes;
          onProgress?.({ ...progress });
        },
        signal,
      );
    } catch (e) {
      throw e instanceof AudioDownloadError ? e : new AudioDownloadError(classifyError(e));
    }
    return this.status(lang, categoryIds);
  }

  /**
   * Deletes downloaded recordings no dhikr plays any more (e.g. the book's, after the owner's
   * new recordings replaced them). Returns how many.
   */
  async removeUnused(lang: string): Promise<number> {
    const [all, registered] = await Promise.all([
      this.o.catalog.listAudioFiles(lang),
      this.o.registry.list(lang),
    ]);
    const used = new Set(all.map((f) => f.fileName));
    const unused = registered.filter((r) => !used.has(r.fileName));
    for (const r of unused) {
      this.o.storage.remove(lang, r.fileName);
      await this.o.registry.remove(lang, r.fileName);
    }
    return unused.length;
  }

  /** Deletes every downloaded file of the language. */
  async deleteAll(lang: string): Promise<void> {
    this.o.storage.removeAll(lang);
    await this.o.registry.removeAll(lang);
  }

  private isComplete(info: AudioFileInfo): boolean {
    return this.o.storage.fileSize(info.lang, info.fileName) === info.bytes;
  }

  private async ensureOne(lang: string, fileName: string, signal?: AbortSignal): Promise<string> {
    const info = await this.o.catalog.getAudioFile(lang, fileName);
    if (!info) throw new AudioDownloadError('failed', `No audio file "${fileName}" for "${lang}"`);
    const { storage, registry } = this.o;
    if (this.isComplete(info)) return storage.uri(lang, fileName);
    if (storage.freeBytes() < info.bytes + STORAGE_MARGIN_BYTES) {
      throw new AudioDownloadError('storage');
    }
    try {
      await storage.download(this.url(lang, fileName), lang, fileName, signal);
    } catch (e) {
      throw new AudioDownloadError(classifyError(e), e instanceof Error ? e.message : String(e));
    }
    // A wrong size means an error page or a cut file: never keep it.
    if (!this.isComplete(info)) {
      storage.remove(lang, fileName);
      throw new AudioDownloadError('failed', `"${fileName}" has the wrong size`);
    }
    await registry.save(lang, fileName, info.bytes);
    return storage.uri(lang, fileName);
  }
}
