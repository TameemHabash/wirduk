/**
 * Test-only stand-ins for expo-audio, expo-document-picker, the user's own
 * audio storage and the downloaded-audio storage (wired in jest.setup.ui.ts).
 * Tests read what was heard (`recordingsHeard`, `ticksHeard`, `player.playing`)
 * and drive player events (`player.emit`, `finishPlaying`).
 */
import { act } from '@testing-library/react-native';

import type { AudioStorage } from '@/features/audio/services/audio-downloads';
import { audioFileName } from '@/features/audio/logic/audio-plan';

import manifest from '../../../content-source/audio-manifest.json';

type StatusListener = (status: Record<string, unknown>) => void;

/** The count tick: its source is the bundled tick.wav, which Jest turns into a number. */
const TICK = 'tick';

/** Every sound that started playing in this test, in order (a replay counts again). */
const heard: string[] = [];

const soundOf = (source: unknown): string =>
  typeof source === 'number' ? TICK : String((source as { uri?: string } | null)?.uri ?? source);

/** One player per `useAudioPlayer` call, like the real hook. */
export function createMockPlayer(source: unknown) {
  const listeners = new Set<StatusListener>();
  const player = {
    source,
    /** Playing now (play, until a pause or the end of the sound). */
    playing: false,
    play: jest.fn(() => {
      player.playing = true;
      heard.push(soundOf(player.source));
    }),
    pause: jest.fn(() => {
      player.playing = false;
    }),
    seekTo: jest.fn(() => Promise.resolve()),
    replace: jest.fn((next: unknown) => {
      player.source = next;
    }),
    setActiveForLockScreen: jest.fn(),
    clearLockScreenControls: jest.fn(),
    addListener: jest.fn((_event: string, listener: StatusListener) => {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    }),
    /** Sends a playback status update, like the native player. */
    emit(status: Record<string, unknown>) {
      if (status.didJustFinish) player.playing = false;
      const full = { isLoaded: true, isBuffering: false, playing: false, ...status };
      for (const l of [...listeners]) l(full);
    },
  };
  return player;
}

export type MockPlayer = ReturnType<typeof createMockPlayer>;

/** Every player created in the current test, in order. */
export const mockPlayers: MockPlayer[] = [];

/** The recordings heard in this test, in order (their file URIs; a replay counts again). */
export function recordingsHeard(): string[] {
  return heard.filter((s) => s !== TICK);
}

/** How many count ticks were heard in this test. */
export function ticksHeard(): number {
  return heard.filter((s) => s === TICK).length;
}

/** The player that was last given a recording to play. */
export function recitationPlayer(): MockPlayer | undefined {
  return [...mockPlayers].reverse().find((p) => p.replace.mock.calls.length > 0);
}

/** The recording now playing comes to its end (as the native player reports it). */
export async function finishPlaying(): Promise<void> {
  const player = recitationPlayer();
  if (!player) throw new Error('No recording was played');
  await act(async () => player.emit({ didJustFinish: true }));
}

export const mockRecorder = {
  uri: 'file:///cache/recording-1.m4a' as string | null,
  prepareToRecordAsync: jest.fn(() => Promise.resolve()),
  record: jest.fn(),
  stop: jest.fn(() => Promise.resolve()),
};

export const recorderState = { isRecording: false, durationMillis: 0 };

export const mockPicker = {
  getDocumentAsync: jest.fn(),
};

export const mockCustomAudio = {
  storeCustomAudio: jest.fn((_uri: string, name?: string) =>
    Promise.resolve(`stored-${name ?? 'recording.m4a'}`),
  ),
  customAudioUri: jest.fn((name: string) => `file:///docs/custom-audio/${name}`),
  deleteCustomAudio: jest.fn(),
};

export const mockPermission = { granted: true };

const SIZES = new Map(manifest.files.map((f) => [f.file, f.bytes]));

/**
 * Downloaded audio in memory. Downloads write the real file size (from the
 * audio manifest) unless `failWith` is set; `hold()` keeps the next
 * downloads waiting until `release()`.
 */
class MockAudioStorage implements AudioStorage {
  files = new Map<string, number>();
  downloads: string[] = [];
  failWith: Error | null = null;
  free = 10 * 1024 * 1024 * 1024;
  private gate: Promise<void> | null = null;
  private open: (() => void) | null = null;

  hold() {
    this.gate = new Promise((resolve) => (this.open = resolve));
  }
  release() {
    this.open?.();
    this.gate = null;
  }
  reset() {
    this.files.clear();
    this.downloads = [];
    this.failWith = null;
    this.free = 10 * 1024 * 1024 * 1024;
    this.release();
  }

  fileSize(lang: string, name: string) {
    return this.files.get(`${lang}/${name}`) ?? 0;
  }
  uri(lang: string, name: string) {
    return `file:///docs/audio/${lang}/${audioFileName(name, 'mp3')}`;
  }
  async download(url: string, lang: string, name: string, signal?: AbortSignal) {
    this.downloads.push(url);
    if (this.gate) await this.gate;
    if (signal?.aborted) {
      const e = new Error('aborted');
      e.name = 'AbortError';
      throw e;
    }
    if (this.failWith) throw this.failWith;
    this.files.set(`${lang}/${name}`, SIZES.get(name) ?? 1);
  }
  remove(lang: string, name: string) {
    this.files.delete(`${lang}/${name}`);
  }
  removeAll(lang: string) {
    for (const key of [...this.files.keys()])
      if (key.startsWith(`${lang}/`)) this.files.delete(key);
  }
  removeUnfinished() {}
  freeBytes() {
    return this.free;
  }
  /** Marks files as already downloaded (with their real sizes). */
  preload(lang: string, ...names: string[]) {
    for (const n of names) this.files.set(`${lang}/${n}`, SIZES.get(n) ?? 1);
  }
}

export const mockAudioStorage = new MockAudioStorage();

/** Where a downloaded recording of the book is played from (as in `recordingsHeard`). */
export const recordingUri = (fileName: string) => mockAudioStorage.uri('ar', fileName);

export function resetAudioMocks(): void {
  mockPlayers.length = 0;
  heard.length = 0;
  mockRecorder.uri = 'file:///cache/recording-1.m4a';
  recorderState.isRecording = false;
  recorderState.durationMillis = 0;
  mockPermission.granted = true;
  mockAudioStorage.reset();
}
