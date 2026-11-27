/**
 * The reader's audio: a recording downloaded on first play, play and pause, played as many
 * times as the count, «العدّ مع الصوت», autoplay, the lock screen, the user's own recordings.
 * The checks are what the user hears (`recordingsHeard`, in order) and sees.
 */
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { APP_CONFIG } from '@/config/app-config';
import type { Repositories } from '@/data/DataProvider';
import type { Dhikr } from '@/data/models';
import { audioFileName } from '@/features/audio/logic/audio-plan';
import { ReaderScreen } from '@/features/reader/screens/ReaderScreen';
import { CATEGORY } from '@/test-utils/fixtures/content';
import {
  finishPlaying,
  mockAudioStorage,
  recitationPlayer,
  recordingsHeard,
  recordingUri,
} from '@/test-utils/mocks/audio';
import { setRouteParams } from '@/test-utils/mocks/router';
import { counted, openReader, tapCounter } from '@/test-utils/reader';
import { createTestRepositories, renderWithApp } from '@/test-utils/render-app';
import { tr } from '@/test-utils/tr';
import { counterStore } from '@/features/reader/state/counter-store';

const PLAY = tr('audio.play');
const PAUSE = tr('audio.pause');
const LOADING = tr('audio.loading');
/** Where a recording is downloaded from (the book's are named without `.mp3`). */
const fileUrl = (name: string) => `${APP_CONFIG.audio.baseUrl}/ar/${audioFileName(name, 'mp3')}`;
const times = (n: number, uri: string) => Array.from({ length: n }, () => uri);
const repeatLine = (current: number, total: number) => tr('audio.repeat', { current, total });

/**
 * Opens the morning adhkar at a dhikr picked from them (default: the first with audio),
 * with «العدّ مع الصوت» off unless `audioCounts`: most tests here are about listening.
 * Returns the dhikr, the next one, and where each shows («3 من 24»).
 */
async function openMorning({
  pick = (all) => all.findIndex((d) => d.audioFile),
  audioCounts = false,
  setup,
  repos: given,
}: {
  pick?: (all: Dhikr[]) => number;
  audioCounts?: boolean;
  setup?: (repos: Repositories) => Promise<unknown>;
  repos?: Repositories;
} = {}) {
  const repos = given ?? (await createTestRepositories());
  const all = await repos.content.listAdhkar(CATEGORY.morning, 'ar');
  const i = pick(all);
  const { placeOf } = await openReader(all[i]!.id, {
    repos,
    setup: async (r) => {
      await r.settings.set('audioCounts', audioCounts);
      await setup?.(r);
    },
  });
  await screen.findByLabelText(PLAY);
  const dhikr = all[i]!;
  const next = all[i + 1]!;
  return {
    repos,
    dhikr,
    next,
    here: placeOf(dhikr.id),
    nextPlace: placeOf(next.id),
    uri: recordingUri(dhikr.audioFile!),
    nextUri: recordingUri(next.audioFile!),
  };
}

/** A dhikr said `min` to 7 times, with audio, followed by another with audio. */
const repeated =
  (min = 2) =>
  (all: Dhikr[]) =>
    all.findIndex((d, j) => d.count >= min && d.count <= 7 && d.audioFile && all[j + 1]?.audioFile);

/** Presses play and waits until the recording starts. */
async function play() {
  const before = recordingsHeard().length;
  await fireEvent.press(screen.getByLabelText(PLAY));
  await waitFor(() => expect(recordingsHeard().length).toBeGreaterThan(before));
}

describe('Reader audio: playing', () => {
  it('downloads a recording on first play, and plays it', async () => {
    const { dhikr, uri } = await openMorning();
    await play();
    expect(mockAudioStorage.downloads).toEqual([fileUrl(dhikr.audioFile!)]);
    expect(recordingsHeard()).toEqual([uri]);
    expect(screen.getByLabelText(PAUSE)).toBeOnTheScreen();
  });

  it('pause stops it', async () => {
    await openMorning();
    await play();
    await fireEvent.press(screen.getByLabelText(PAUSE));
    expect(recitationPlayer()!.playing).toBe(false);
    expect(screen.getByLabelText(PLAY)).toBeOnTheScreen();
  });

  it('plays a downloaded recording without the internet', async () => {
    const all = await (await createTestRepositories()).content.listAdhkar(CATEGORY.morning, 'ar');
    mockAudioStorage.preload('ar', all.find((d) => d.audioFile)!.audioFile!);
    mockAudioStorage.failWith = new Error('Unable to resolve host');
    const { uri } = await openMorning();
    await play();
    expect(mockAudioStorage.downloads).toEqual([]);
    expect(recordingsHeard()).toEqual([uri]);
  });

  it('shows a spinner while downloading; a second tap cancels', async () => {
    await openMorning();
    mockAudioStorage.hold();
    await fireEvent.press(screen.getByLabelText(PLAY));
    expect(await screen.findByLabelText(LOADING)).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText(LOADING));
    expect(screen.getByLabelText(PLAY)).toBeOnTheScreen();
    await act(async () => mockAudioStorage.release());
    expect(recordingsHeard()).toEqual([]);
  });

  it('explains clearly when there is no connection', async () => {
    await openMorning();
    mockAudioStorage.failWith = new Error('java.net.UnknownHostException: Unable to resolve host');
    await fireEvent.press(screen.getByLabelText(PLAY));
    expect(await screen.findByText(tr('audio.errors.offline'))).toBeOnTheScreen();
    expect(screen.getByLabelText(PLAY)).toBeOnTheScreen();
  });

  it('with autoplay off, stops at the end of the recording', async () => {
    const { here, uri } = await openMorning({
      setup: (repos) => repos.settings.set('autoplayNext', false),
    });
    await play();
    await finishPlaying();
    expect(recordingsHeard()).toEqual([uri]);
    expect(screen.getByText(here)).toBeOnTheScreen();
    expect(screen.getByLabelText(PLAY)).toBeOnTheScreen();
  });

  it('stops the recording when the user swipes to another dhikr', async () => {
    const { nextPlace, uri, repos, next } = await openMorning();
    await play();
    const all = await repos.content.listAdhkar(CATEGORY.morning, 'ar');
    const pager = screen.getByTestId('pager');
    const scroll = (pageScrollState: string) =>
      fireEvent(pager, 'pageScrollStateChanged', { nativeEvent: { pageScrollState } });
    await scroll('dragging');
    await fireEvent(pager, 'pageSelected', {
      nativeEvent: { position: all.findIndex((d) => d.id === next.id) },
    });
    await scroll('idle');
    expect(screen.getByText(nextPlace)).toBeOnTheScreen();
    expect(recitationPlayer()!.playing).toBe(false);
    expect(recordingsHeard()).toEqual([uri]);
    expect(screen.getByLabelText(PLAY)).toBeOnTheScreen();
  });

  it("plays the user's own recording from their folder, without downloading", async () => {
    const repos = await createTestRepositories();
    const cat = await repos.custom.createCategory('أدعيتي');
    await repos.custom.createDhikr(cat.id, { text: 'نص', count: 1, audioFile: 'mine.m4a' });
    await repos.custom.createDhikr(cat.id, { text: 'بلا صوت', count: 1 });
    setRouteParams({ id: String(cat.id) });
    await renderWithApp(<ReaderScreen />, repos);
    await fireEvent.press(await screen.findByLabelText(PLAY));
    await waitFor(() => expect(recordingsHeard()).toEqual(['file:///docs/custom-audio/mine.m4a']));
    expect(mockAudioStorage.downloads).toEqual([]);
  });

  it('has no play button for a dhikr without audio', async () => {
    const repos = await createTestRepositories();
    const cat = await repos.custom.createCategory('أدعيتي');
    await repos.custom.createDhikr(cat.id, { text: 'بلا صوت', count: 1 });
    setRouteParams({ id: String(cat.id) });
    await renderWithApp(<ReaderScreen />, repos);
    await screen.findByText('بلا صوت');
    expect(screen.queryByLabelText(PLAY)).toBeNull();
  });
});

describe('Reader audio: the lock screen (native controls)', () => {
  it('shows its controls only with background playback on', async () => {
    const { repos } = await openMorning();
    await play();
    const title = (await repos.content.getCategory(CATEGORY.morning, 'ar'))!.title;
    expect(recitationPlayer()!.setActiveForLockScreen).toHaveBeenCalledWith(true, {
      title,
      artist: tr('appName'),
    });
  });

  it('never shows them with background playback off', async () => {
    await openMorning({ setup: (repos) => repos.settings.set('backgroundPlayback', false) });
    await play();
    expect(recitationPlayer()!.setActiveForLockScreen).not.toHaveBeenCalled();
  });
});

describe('Reader audio: listening only (the audio does not count; owner, 2026-10-31)', () => {
  it('after the recording, the reader waits for the count', async () => {
    const { dhikr, here, uri } = await openMorning();
    expect(dhikr.count).toBe(1);
    await play();
    await finishPlaying();
    // Not counted, so not moved on (it used to go to the next dhikr here).
    expect(screen.getByText(here)).toBeOnTheScreen();
    expect(recordingsHeard()).toEqual([uri]);
    expect(screen.getByLabelText(PLAY)).toBeOnTheScreen();
    expect(screen.getByLabelText(counted(0, 1))).toBeOnTheScreen();
  });

  it('once the user counts it, the reader moves on and the next recording plays', async () => {
    const { nextPlace, nextUri } = await openMorning();
    await play();
    await finishPlaying();
    await tapCounter();
    await waitFor(() => expect(recordingsHeard().at(-1)).toBe(nextUri));
    await waitFor(() => expect(screen.getByText(nextPlace)).toBeOnTheScreen(), { timeout: 2000 });
  });

  it('plays the recording as many times as the count, showing «التكرار n من N»', async () => {
    const { dhikr, here, uri } = await openMorning({ pick: repeated() });
    await play();
    expect(screen.getByText(repeatLine(1, dhikr.count))).toBeOnTheScreen();
    for (let n = 2; n <= dhikr.count; n++) {
      await finishPlaying();
      expect(screen.getByText(repeatLine(n, dhikr.count))).toBeOnTheScreen();
    }
    expect(recordingsHeard()).toEqual(times(dhikr.count, uri));
    expect(screen.getByText(here)).toBeOnTheScreen();
  });

  it('after the last play it stays, uncounted, until the user counts it to the end', async () => {
    const { dhikr, here, uri, nextUri, nextPlace } = await openMorning({ pick: repeated() });
    await play();
    for (let n = 1; n <= dhikr.count; n++) await finishPlaying();
    expect(recordingsHeard()).toEqual(times(dhikr.count, uri));
    expect(screen.getByText(here)).toBeOnTheScreen();
    expect(screen.queryByText(repeatLine(dhikr.count, dhikr.count))).toBeNull();
    expect(screen.getByLabelText(counted(0, dhikr.count))).toBeOnTheScreen();

    for (let n = 0; n < dhikr.count; n++) await tapCounter();
    await waitFor(() => expect(recordingsHeard().at(-1)).toBe(nextUri));
    await waitFor(() => expect(screen.getByText(nextPlace)).toBeOnTheScreen(), { timeout: 2000 });
  });

  it('counting the dhikr to its end while it plays: on to the next, which plays', async () => {
    const { nextPlace, nextUri } = await openMorning();
    await play();
    await tapCounter(); // count 1: done, before the recording ends
    await waitFor(() => expect(recordingsHeard().at(-1)).toBe(nextUri));
    await waitFor(() => expect(screen.getByText(nextPlace)).toBeOnTheScreen(), { timeout: 2000 });
  });

  it('after a pause, counting the dhikr to its end plays nothing', async () => {
    const { nextPlace, uri } = await openMorning();
    await play();
    await fireEvent.press(screen.getByLabelText(PAUSE));
    await tapCounter();
    await waitFor(() => expect(screen.getByText(nextPlace)).toBeOnTheScreen(), { timeout: 2000 });
    expect(recordingsHeard()).toEqual([uri]);
    expect(screen.getByLabelText(PLAY)).toBeOnTheScreen();
  });

  it('counting a dhikr the user did not play starts no audio', async () => {
    const { nextPlace } = await openMorning();
    await tapCounter();
    await waitFor(() => expect(screen.getByText(nextPlace)).toBeOnTheScreen(), { timeout: 2000 });
    expect(recordingsHeard()).toEqual([]);
  });
});

describe('Reader audio: «العدّ مع الصوت» (on by default)', () => {
  it('each play counts; at the count the reader moves on and plays the next', async () => {
    const { dhikr, nextPlace, nextUri } = await openMorning({
      pick: repeated(),
      audioCounts: true,
    });
    await play();
    await finishPlaying();
    expect(screen.getByLabelText(counted(1, dhikr.count))).toBeOnTheScreen();
    for (let n = 2; n <= dhikr.count; n++) await finishPlaying();
    expect(counterStore.get(dhikr.id)).toBe(dhikr.count);
    await waitFor(() => expect(screen.getByText(nextPlace)).toBeOnTheScreen(), { timeout: 2000 });
    await waitFor(() => expect(recordingsHeard().at(-1)).toBe(nextUri));
  });

  it('the counter shows the progress (no «التكرار» line)', async () => {
    const { dhikr } = await openMorning({ pick: repeated(3), audioCounts: true });
    await play();
    for (let n = 1; n < dhikr.count; n++) {
      await finishPlaying();
      expect(screen.getByLabelText(counted(n, dhikr.count))).toBeOnTheScreen();
    }
    expect(screen.queryByText(repeatLine(1, dhikr.count))).toBeNull();
  });

  it('plays only the times still left after counting by hand', async () => {
    const { dhikr, uri } = await openMorning({ pick: repeated(3), audioCounts: true });
    await tapCounter();
    await play();
    for (let n = 2; n <= dhikr.count; n++) await finishPlaying();
    expect(counterStore.get(dhikr.id)).toBe(dhikr.count);
    // Its recording count − 1 times (the next dhikr's then starts by itself).
    expect(recordingsHeard().filter((u) => u === uri)).toEqual(times(dhikr.count - 1, uri));
  });
});

describe('Reader audio: a recording that says the dhikr several times', () => {
  /**
   * A morning dhikr with audio, followed by another with audio, changed to count 8 with a
   * recording that says it 4 times: 2 plays for the count.
   */
  async function openSaidFourTimes(audioCounts: boolean) {
    const repos = await createTestRepositories();
    const real = await repos.content.listAdhkar(CATEGORY.morning, 'ar');
    const i = real.findIndex((d, j) => d.audioFile && real[j + 1]?.audioFile);
    const id = real[i]!.id;
    const list = repos.content.listAdhkar.bind(repos.content);
    jest
      .spyOn(repos.content, 'listAdhkar')
      .mockImplementation(async (...args) =>
        (await list(...args)).map((d) => (d.id === id ? { ...d, count: 8, audioRepeats: 4 } : d)),
      );
    return openMorning({ repos, pick: () => i, audioCounts });
  }

  it('listening only: plays count ÷ 4 times (here 2), then waits for the count', async () => {
    const { dhikr, uri } = await openSaidFourTimes(false);
    await play();
    expect(screen.getByText(repeatLine(1, 2))).toBeOnTheScreen();
    await finishPlaying();
    expect(screen.getByText(repeatLine(2, 2))).toBeOnTheScreen();
    await finishPlaying();
    expect(recordingsHeard()).toEqual(times(2, uri));
    expect(counterStore.get(dhikr.id)).toBe(0); // listening only: taps count
  });

  it('listening only: «إتمام» counts it, so on to the next, which plays', async () => {
    const { nextUri } = await openSaidFourTimes(false);
    await play();
    await finishPlaying();
    await finishPlaying();
    await fireEvent.press(screen.getByLabelText(tr('reader.completeLabel')));
    await waitFor(() => expect(recordingsHeard().at(-1)).toBe(nextUri));
  });

  it('with «العدّ مع الصوت», each play counts 4', async () => {
    const { dhikr, nextUri } = await openSaidFourTimes(true);
    await play();
    await finishPlaying();
    expect(screen.getByLabelText(counted(4, 8))).toBeOnTheScreen();
    await finishPlaying();
    expect(counterStore.get(dhikr.id)).toBe(8);
    await waitFor(() => expect(recordingsHeard().at(-1)).toBe(nextUri));
  });

  it('after counting by hand, plays what is left and never counts past the count', async () => {
    const { dhikr, uri } = await openSaidFourTimes(true);
    await tapCounter();
    expect(counterStore.get(dhikr.id)).toBe(1);
    await play(); // 7 left: 2 plays (4, then the last 3)
    await finishPlaying();
    expect(screen.getByLabelText(counted(5, 8))).toBeOnTheScreen();
    await finishPlaying();
    expect(counterStore.get(dhikr.id)).toBe(8);
    expect(recordingsHeard().filter((u) => u === uri)).toEqual(times(2, uri));
  });
});

describe('Reader audio with the default settings', () => {
  it('each play counts: the counter goes up with the audio and the reader moves on', async () => {
    const repos = await createTestRepositories(); // «العدّ مع الصوت» as it comes: on
    const all = await repos.content.listAdhkar(CATEGORY.morning, 'ar');
    const i = repeated()(all);
    const { placeOf } = await openReader(all[i]!.id, { repos });
    await play();
    await finishPlaying();
    expect(screen.getByLabelText(counted(1, all[i]!.count))).toBeOnTheScreen();
    for (let n = 2; n <= all[i]!.count; n++) await finishPlaying();
    await waitFor(() => expect(screen.getByText(placeOf(all[i + 1]!.id))).toBeOnTheScreen(), {
      timeout: 2000,
    });
    await waitFor(() =>
      expect(recordingsHeard().at(-1)).toBe(recordingUri(all[i + 1]!.audioFile!)),
    );
  });
});
