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

import {
  AudioDownloads,
  type AudioStorage,
  type DownloadAllProgress,
} from '@/features/audio/services/audio-downloads';
import {
  type AudioErrorKind,
  type DownloadScope,
  classifyError,
} from '@/features/audio/logic/audio-plan';
import { expoAudioStorage } from '@/features/audio/services/expo-audio-storage';

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

/** The progress of "download all" is shown at most this often (it can finish many files a second). */
const PROGRESS_EVERY_MS = 250;

/** What never changes: the downloader and the actions. */
interface AudioActions {
  downloads: AudioDownloads;
  /** Audio language: the app language. */
  lang: string;
  startDownloadAll: (scope: DownloadScope) => void;
  cancelDownloadAll: () => void;
  deleteAll: () => Promise<void>;
  /** Call after a single file was downloaded (e.g. played for the first time). */
  notifyChanged: () => void;
}

/** What changes while downloading. */
interface AudioState {
  /** The one download running or last run (one at a time). */
  downloadAll: DownloadAllState;
  /**
   * Goes up whenever downloaded files change (a file played the first time, a download
   * finished or stopped, a delete), so screens read the status again. Not on each file of a
   * running download: `useAudioStatus` adds those from its progress.
   */
  changes: number;
}

const ActionsContext = createContext<AudioActions | null>(null);
const StateContext = createContext<AudioState | null>(null);

/**
 * Owns audio downloads for the whole app, so "download all" keeps going
 * (and keeps its progress) while the user moves between screens. Two contexts: the reader
 * uses only the actions, so a running download does not draw it again.
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

  // The latest progress not shown yet, and when progress was last shown.
  const pending = useRef<DownloadAllProgress | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAt = useRef(0);
  const stopProgress = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
  }, []);

  const startDownloadAll = useCallback(
    (scope: DownloadScope) => {
      if (controller.current) return;
      const abort = new AbortController();
      controller.current = abort;
      setDownloadAll({
        phase: 'running',
        scope,
        progress: { doneFiles: 0, totalFiles: 0, doneBytes: 0, totalBytes: 0, doneNames: [] },
      });
      const show = () => {
        timer.current = null;
        const progress = pending.current;
        if (!progress || controller.current !== abort) return;
        pending.current = null;
        shownAt.current = Date.now();
        setDownloadAll({ phase: 'running', scope, progress });
      };
      downloads
        .downloadAll(lang, {
          signal: abort.signal,
          categoryIds: scopeCategories(scope),
          onProgress: (progress) => {
            pending.current = progress;
            const wait = PROGRESS_EVERY_MS - (Date.now() - shownAt.current);
            if (wait <= 0) show();
            else if (!timer.current) timer.current = setTimeout(show, wait);
          },
        })
        .then(
          () => {
            stopProgress();
            setDownloadAll({ phase: 'done', scope });
          },
          (e: unknown) => {
            stopProgress();
            setDownloadAll({ phase: 'stopped', scope, reason: classifyError(e) });
          },
        )
        .finally(() => {
          controller.current = null;
          setChanges((n) => n + 1);
        });
    },
    [downloads, lang, stopProgress],
  );

  const cancelDownloadAll = useCallback(() => controller.current?.abort(), []);

  const deleteAll = useCallback(async () => {
    controller.current?.abort();
    await downloads.deleteAll(lang);
    setDownloadAll({ phase: 'idle' });
    setChanges((n) => n + 1);
  }, [downloads, lang]);

  // Stop downloading when the app (or this provider) goes away.
  useEffect(
    () => () => {
      controller.current?.abort();
      stopProgress();
    },
    [stopProgress],
  );

  // On start: delete downloaded recordings no dhikr plays any more (milestone 11: the book's
  // recordings the owner's replaced).
  useEffect(() => {
    void downloads
      .removeUnused(lang)
      .then((n) => n > 0 && setChanges((c) => c + 1))
      .catch(() => undefined);
  }, [downloads, lang]);

  const actions = useMemo<AudioActions>(
    () => ({ downloads, lang, startDownloadAll, cancelDownloadAll, deleteAll, notifyChanged }),
    [downloads, lang, startDownloadAll, cancelDownloadAll, deleteAll, notifyChanged],
  );
  const state = useMemo<AudioState>(() => ({ downloadAll, changes }), [downloadAll, changes]);

  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </ActionsContext.Provider>
  );
}

/** The downloader and the actions only: never draws again for a download's progress. */
export function useAudioActions(): AudioActions {
  const value = useContext(ActionsContext);
  if (!value) throw new Error('useAudioActions must be used inside <AudioProvider>');
  return value;
}

/** Everything, the download's progress included. */
export function useAudio(): AudioActions & AudioState {
  const actions = useAudioActions();
  const state = useContext(StateContext);
  if (!state) throw new Error('useAudio must be used inside <AudioProvider>');
  return useMemo(() => ({ ...actions, ...state }), [actions, state]);
}
