import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { APP_CONFIG } from '@/config/app-config';
import { useRepositories } from '@/data/DataProvider';

import { AudioDownloads, type AudioStorage, type DownloadAllProgress } from './audio-downloads';
import { type AudioErrorKind, type DownloadScope, classifyError } from './audio-plan';
import { expoAudioStorage } from './expo-audio-storage';

export type DownloadAllState =
  | { phase: 'idle' }
  | { phase: 'running'; scope: DownloadScope; progress: DownloadAllProgress }
  | { phase: 'done'; scope: DownloadScope }
  | { phase: 'stopped'; scope: DownloadScope; reason: AudioErrorKind };

/** The categories a download takes (undefined: all of them). */
export function scopeCategories(scope: DownloadScope): readonly number[] | undefined {
  const { morningCategoryId, eveningCategoryId } = APP_CONFIG.content;
  return scope === 'morningEvening' ? [morningCategoryId, eveningCategoryId] : undefined;
}

interface AudioContextValue {
  downloads: AudioDownloads;
  /** Audio language: the app language. */
  lang: string;
  /** The one download running or last run (one at a time). */
  downloadAll: DownloadAllState;
  /** Goes up whenever downloaded files change, so screens can refresh. */
  changes: number;
  startDownloadAll: (scope: DownloadScope) => void;
  cancelDownloadAll: () => void;
  deleteAll: () => Promise<void>;
  /** Call after a single file was downloaded (e.g. played for the first time). */
  notifyChanged: () => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

/**
 * Owns audio downloads for the whole app, so "download all" keeps going
 * (and keeps its progress) while the user moves between screens.
 */
export function AudioProvider({
  children,
  storage = expoAudioStorage,
}: {
  children: ReactNode;
  storage?: AudioStorage;
}) {
  const { content, downloadedAudio } = useRepositories();
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const downloads = useMemo(
    () =>
      new AudioDownloads({
        storage,
        registry: downloadedAudio,
        catalog: content,
        baseUrl: APP_CONFIG.audio.baseUrl,
        extension: APP_CONFIG.audio.extension,
        maxParallel: APP_CONFIG.audio.maxParallelDownloads,
      }),
    [storage, downloadedAudio, content],
  );

  const [downloadAll, setDownloadAll] = useState<DownloadAllState>({ phase: 'idle' });
  const [changes, setChanges] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const notifyChanged = useCallback(() => setChanges((n) => n + 1), []);

  const startDownloadAll = useCallback(
    (scope: DownloadScope) => {
      if (controller.current) return;
      const abort = new AbortController();
      controller.current = abort;
      setDownloadAll({
        phase: 'running',
        scope,
        progress: { doneFiles: 0, totalFiles: 0, doneBytes: 0, totalBytes: 0 },
      });
      downloads
        .downloadAll(lang, {
          signal: abort.signal,
          categoryIds: scopeCategories(scope),
          onProgress: (progress) => {
            setDownloadAll({ phase: 'running', scope, progress });
            setChanges((n) => n + 1);
          },
        })
        .then(
          () => setDownloadAll({ phase: 'done', scope }),
          (e: unknown) => setDownloadAll({ phase: 'stopped', scope, reason: classifyError(e) }),
        )
        .finally(() => {
          controller.current = null;
          setChanges((n) => n + 1);
        });
    },
    [downloads, lang],
  );

  const cancelDownloadAll = useCallback(() => controller.current?.abort(), []);

  const deleteAll = useCallback(async () => {
    controller.current?.abort();
    await downloads.deleteAll(lang);
    setDownloadAll({ phase: 'idle' });
    setChanges((n) => n + 1);
  }, [downloads, lang]);

  // Stop downloading when the app (or this provider) goes away.
  useEffect(() => () => controller.current?.abort(), []);

  // On start: delete downloaded recordings no dhikr plays any more (milestone 11: the book's
  // recordings the owner's replaced).
  useEffect(() => {
    void downloads
      .removeUnused(lang)
      .then((n) => n > 0 && setChanges((c) => c + 1))
      .catch(() => undefined);
  }, [downloads, lang]);

  const value = useMemo<AudioContextValue>(
    () => ({
      downloads,
      lang,
      downloadAll,
      changes,
      startDownloadAll,
      cancelDownloadAll,
      deleteAll,
      notifyChanged,
    }),
    [
      downloads,
      lang,
      downloadAll,
      changes,
      startDownloadAll,
      cancelDownloadAll,
      deleteAll,
      notifyChanged,
    ],
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio(): AudioContextValue {
  const value = useContext(AudioContext);
  if (!value) throw new Error('useAudio must be used inside <AudioProvider>');
  return value;
}
