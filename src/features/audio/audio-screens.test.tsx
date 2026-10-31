import { Alert, Linking } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { APP_CONFIG } from '@/config/app-config';
import { audioFileName, toMegabytes } from '@/features/audio/audio-plan';
import { AudioDownloadsScreen } from '@/features/audio/AudioDownloadsScreen';
import { counterStore } from '@/features/counter/counter-store';
import { ReaderScreen } from '@/features/reader/ReaderScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { mockAudioStorage, recitationPlayer } from '@/test-utils/audio-mock';
import { createTestRepositories, renderWithApp } from '@/test-utils/render-app';
import { mockRouter, setRouteParams } from '@/test-utils/router-mock';

const PLAY = 'تشغيل الصوت';
const PAUSE = 'إيقاف الصوت مؤقتًا';
const LOADING = 'جارٍ تحميل الصوت';
/** The book's recordings are named without `.mp3`; the owner's keep their extension (`.m4a`). */
const fileUrl = (name: string) => `${APP_CONFIG.audio.baseUrl}/ar/${audioFileName(name, 'mp3')}`;
const localUri = (name: string) => `file:///docs/audio/ar/${audioFileName(name, 'mp3')}`;

/**
 * Opens the morning adhkar at their first dhikr with audio. `adhkar` starts
 * there; `pos(k)` is the position text of adhkar[k], e.g. "2 من 24". With
 * «العدّ مع الصوت» off (on by default since 2026-10-31): these tests are about
 * listening; the counting ones turn it on.
 */
async function openMorning(
  setup?: (repos: Awaited<ReturnType<typeof createTestRepositories>>) => Promise<void>,
) {
  const repos = await createTestRepositories();
  await repos.settings.set('audioCounts', false);
  await setup?.(repos);
  const all = await repos.content.listAdhkar(1, 'ar');
  const first = all.findIndex((d) => d.audioFile);
  const adhkar = all.slice(first);
  counterStore.resetMany(all.map((d) => d.id));
  setRouteParams({ id: '1', dhikr: String(adhkar[0]!.id) });
  await renderWithApp(<ReaderScreen />, repos);
  await screen.findByLabelText(PLAY);
  return { repos, adhkar, pos: (k: number) => `${first + k + 1} من ${all.length}` };
}

describe('Reader audio', () => {
  it('downloads a recording on first play, then plays and pauses it', async () => {
    const { adhkar } = await openMorning();
    const file = adhkar[0]!.audioFile!;
    await fireEvent.press(screen.getByLabelText(PLAY));
    await waitFor(() => expect(recitationPlayer()?.play).toHaveBeenCalled());
    expect(mockAudioStorage.downloads).toEqual([fileUrl(file)]);
    expect(recitationPlayer()!.replace).toHaveBeenCalledWith({ uri: localUri(file) });
    await fireEvent.press(screen.getByLabelText(PAUSE));
    expect(recitationPlayer()!.pause).toHaveBeenCalled();
    expect(screen.getByLabelText(PLAY)).toBeOnTheScreen();
  });

  it('plays a downloaded recording without the internet', async () => {
    const { adhkar } = await openMorning();
    mockAudioStorage.preload('ar', adhkar[0]!.audioFile!);
    mockAudioStorage.failWith = new Error('Unable to resolve host');
    await fireEvent.press(screen.getByLabelText(PLAY));
    await waitFor(() => expect(recitationPlayer()?.play).toHaveBeenCalled());
    expect(mockAudioStorage.downloads).toEqual([]);
  });

  it('shows a spinner while downloading; a second tap cancels', async () => {
    await openMorning();
    mockAudioStorage.hold();
    await fireEvent.press(screen.getByLabelText(PLAY));
    expect(await screen.findByLabelText(LOADING)).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText(LOADING));
    expect(screen.getByLabelText(PLAY)).toBeOnTheScreen();
    await act(async () => mockAudioStorage.release());
    expect(recitationPlayer()?.play ?? jest.fn()).not.toHaveBeenCalled();
  });

  it('explains clearly when there is no connection', async () => {
    await openMorning();
    mockAudioStorage.failWith = new Error('java.net.UnknownHostException: Unable to resolve host');
    await fireEvent.press(screen.getByLabelText(PLAY));
    expect(
      await screen.findByText(
        'لا يوجد اتصال بالإنترنت. يُحمَّل صوت الذكر مرة واحدة، ثم يعمل دون إنترنت.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText(PLAY)).toBeOnTheScreen();
  });

  /** The counter: an accessibility "activate" is one tap. */
  const tapCounter = async () =>
    fireEvent(screen.getByLabelText(/^تم \d+ من \d+$/), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });

  it('the audio does not count: after its plays the reader waits for the count (owner, 2026-10-31)', async () => {
    const { adhkar, pos } = await openMorning();
    expect(adhkar[0]!.count).toBe(1);
    await fireEvent.press(screen.getByLabelText(PLAY));
    await waitFor(() => expect(recitationPlayer()?.play).toHaveBeenCalled());
    const player = recitationPlayer()!;
    await act(async () => player.emit({ didJustFinish: true }));
    // Not counted, so not moved on (it used to go to the next dhikr here).
    expect(screen.getByText(pos(0))).toBeOnTheScreen();
    expect(player.replace).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(PLAY)).toBeOnTheScreen();
    expect(counterStore.get(adhkar[0]!.id)).toBe(0);

    // The user counts it: the reader moves on, and the next recording plays (autoplay).
    await tapCounter();
    await waitFor(() =>
      expect(player.replace).toHaveBeenLastCalledWith({ uri: localUri(adhkar[1]!.audioFile!) }),
    );
    await waitFor(() => expect(screen.getByText(pos(1))).toBeOnTheScreen(), { timeout: 2000 });
  });

  it('repeats a recording as many times as the count, then waits for the count', async () => {
    const repos = await createTestRepositories();
    await repos.settings.set('audioCounts', false); // listening only
    const adhkar = await repos.content.listAdhkar(1, 'ar');
    // A morning dhikr said a few times, with audio, followed by another one with audio.
    const i = adhkar.findIndex(
      (d, j) => d.count >= 2 && d.count <= 7 && d.audioFile && adhkar[j + 1]?.audioFile,
    );
    const dhikr = adhkar[i]!;
    counterStore.resetMany(adhkar.map((d) => d.id));
    setRouteParams({ id: '1', dhikr: String(dhikr.id) });
    await renderWithApp(<ReaderScreen />, repos);
    await fireEvent.press(await screen.findByLabelText(PLAY));
    await waitFor(() => expect(recitationPlayer()?.play).toHaveBeenCalled());
    const player = recitationPlayer()!;
    expect(screen.getByText(`التكرار 1 من ${dhikr.count}`)).toBeOnTheScreen();

    for (let n = 2; n <= dhikr.count; n++) {
      await act(async () => player.emit({ didJustFinish: true }));
      expect(screen.getByText(`التكرار ${n} من ${dhikr.count}`)).toBeOnTheScreen();
    }
    expect(player.seekTo).toHaveBeenCalledTimes(dhikr.count - 1);
    expect(player.replace).toHaveBeenCalledTimes(1); // the same recording, again
    expect(screen.getByText(`${i + 1} من ${adhkar.length}`)).toBeOnTheScreen();

    // The last play: the audio does not count for the user, so the reader stays.
    await act(async () => player.emit({ didJustFinish: true }));
    expect(player.replace).toHaveBeenCalledTimes(1);
    expect(screen.getByText(`${i + 1} من ${adhkar.length}`)).toBeOnTheScreen();
    expect(screen.queryByText(/^التكرار/)).toBeNull();
    expect(counterStore.get(dhikr.id)).toBe(0);

    // The user counts it to the end: on to the next dhikr, which plays.
    for (let n = 0; n < dhikr.count; n++) await tapCounter();
    await waitFor(() =>
      expect(player.replace).toHaveBeenLastCalledWith({
        uri: localUri(adhkar[i + 1]!.audioFile!),
      }),
    );
    await waitFor(
      () => expect(screen.getByText(`${i + 2} من ${adhkar.length}`)).toBeOnTheScreen(),
      {
        timeout: 2000,
      },
    );
  });

  it('counting the dhikr to its end while it plays: on to the next, which plays', async () => {
    const { adhkar, pos } = await openMorning();
    await fireEvent.press(screen.getByLabelText(PLAY));
    await waitFor(() => expect(recitationPlayer()?.play).toHaveBeenCalled());
    const player = recitationPlayer()!;
    await tapCounter(); // count 1: done, before the recording ends
    await waitFor(() =>
      expect(player.replace).toHaveBeenLastCalledWith({ uri: localUri(adhkar[1]!.audioFile!) }),
    );
    await waitFor(() => expect(screen.getByText(pos(1))).toBeOnTheScreen(), { timeout: 2000 });
  });

  it('after a pause, counting the dhikr to its end plays nothing', async () => {
    const { pos } = await openMorning();
    await fireEvent.press(screen.getByLabelText(PLAY));
    await waitFor(() => expect(recitationPlayer()?.play).toHaveBeenCalled());
    const player = recitationPlayer()!;
    await fireEvent.press(screen.getByLabelText(PAUSE));
    await tapCounter();
    await waitFor(() => expect(screen.getByText(pos(1))).toBeOnTheScreen(), { timeout: 2000 });
    expect(player.replace).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(PLAY)).toBeOnTheScreen();
  });

  it('counting a dhikr the user did not play starts no audio', async () => {
    const { pos } = await openMorning();
    await tapCounter();
    await waitFor(() => expect(screen.getByText(pos(1))).toBeOnTheScreen(), { timeout: 2000 });
    expect(recitationPlayer()?.replace ?? jest.fn()).not.toHaveBeenCalled();
  });

  describe('with "count with the audio" on', () => {
    /** A morning dhikr said a few times, with audio, followed by another one with audio. */
    async function openRepeated() {
      const repos = await createTestRepositories();
      await repos.settings.set('audioCounts', true);
      const adhkar = await repos.content.listAdhkar(1, 'ar');
      const i = adhkar.findIndex(
        (d, j) => d.count >= 3 && d.count <= 7 && d.audioFile && adhkar[j + 1]?.audioFile,
      );
      counterStore.resetMany(adhkar.map((d) => d.id));
      setRouteParams({ id: '1', dhikr: String(adhkar[i]!.id) });
      await renderWithApp(<ReaderScreen />, repos);
      await screen.findByLabelText(PLAY);
      return { adhkar, i, dhikr: adhkar[i]! };
    }
    const counter = () => screen.getByLabelText(/^تم \d+ من \d+$/);
    const finish = async (player: ReturnType<typeof recitationPlayer>) =>
      act(async () => player!.emit({ didJustFinish: true }));

    it('counts each play, then moves on and plays the next dhikr', async () => {
      const { adhkar, i, dhikr } = await openRepeated();
      await fireEvent.press(screen.getByLabelText(PLAY));
      await waitFor(() => expect(recitationPlayer()?.play).toHaveBeenCalled());
      const player = recitationPlayer();
      for (let n = 1; n < dhikr.count; n++) {
        await finish(player);
        expect(counter().props.accessibilityLabel).toBe(`تم ${n} من ${dhikr.count}`);
      }
      expect(screen.queryByText(/^التكرار/)).toBeNull(); // the counter shows the progress
      await finish(player);
      expect(counterStore.get(dhikr.id)).toBe(dhikr.count);
      await waitFor(
        () => expect(screen.getByText(`${i + 2} من ${adhkar.length}`)).toBeOnTheScreen(),
        {
          timeout: 2000,
        },
      );
      await waitFor(() =>
        expect(player!.replace).toHaveBeenLastCalledWith({
          uri: localUri(adhkar[i + 1]!.audioFile!),
        }),
      );
    });

    it('plays only the times still left after counting by hand', async () => {
      const { dhikr } = await openRepeated();
      await fireEvent(counter(), 'accessibilityAction', {
        nativeEvent: { actionName: 'activate' },
      });
      await fireEvent.press(screen.getByLabelText(PLAY));
      await waitFor(() => expect(recitationPlayer()?.play).toHaveBeenCalled());
      const player = recitationPlayer();
      for (let n = 2; n <= dhikr.count; n++) await finish(player);
      expect(counterStore.get(dhikr.id)).toBe(dhikr.count);
      expect(player!.seekTo).toHaveBeenCalledTimes(dhikr.count - 2); // count − 1 plays in all
    });
  });

  describe('a recording that says the dhikr several times', () => {
    /**
     * A morning dhikr with audio, followed by another with audio, changed to
     * count 8 with a recording that says it 4 times: 2 plays for the count.
     */
    async function openSaidFourTimes(audioCounts: boolean) {
      const repos = await createTestRepositories();
      await repos.settings.set('audioCounts', audioCounts);
      const real = await repos.content.listAdhkar(1, 'ar');
      const i = real.findIndex((d, j) => d.audioFile && real[j + 1]?.audioFile);
      const id = real[i]!.id;
      const list = repos.content.listAdhkar.bind(repos.content);
      jest
        .spyOn(repos.content, 'listAdhkar')
        .mockImplementation(async (...args) =>
          (await list(...args)).map((d) => (d.id === id ? { ...d, count: 8, audioRepeats: 4 } : d)),
        );
      counterStore.resetMany(real.map((d) => d.id));
      setRouteParams({ id: '1', dhikr: String(id) });
      await renderWithApp(<ReaderScreen />, repos);
      await screen.findByLabelText(PLAY);
      return { adhkar: real, i, id };
    }
    const counter = () => screen.getByLabelText(/^تم \d+ من \d+$/);
    const finish = async (player: ReturnType<typeof recitationPlayer>) =>
      act(async () => player!.emit({ didJustFinish: true }));
    const start = async () => {
      await fireEvent.press(screen.getByLabelText(PLAY));
      await waitFor(() => expect(recitationPlayer()?.play).toHaveBeenCalled());
      return recitationPlayer()!;
    };

    it('plays count ÷ 4 times (here 2), then waits for the count', async () => {
      const { adhkar, i, id } = await openSaidFourTimes(false);
      const player = await start();
      expect(screen.getByText('التكرار 1 من 2')).toBeOnTheScreen();
      await finish(player);
      expect(screen.getByText('التكرار 2 من 2')).toBeOnTheScreen();
      await finish(player);
      expect(player.seekTo).toHaveBeenCalledTimes(1);
      expect(player.replace).toHaveBeenCalledTimes(1); // still on this dhikr
      expect(counterStore.get(id)).toBe(0); // listening only: taps count
      // «إتمام»: done by the user, so on to the next, which plays.
      await fireEvent.press(screen.getByLabelText(/^إتمام/));
      await waitFor(() =>
        expect(player.replace).toHaveBeenLastCalledWith({
          uri: localUri(adhkar[i + 1]!.audioFile!),
        }),
      );
    });

    it('with "count with the audio", each play counts 4', async () => {
      const { adhkar, i, id } = await openSaidFourTimes(true);
      const player = await start();
      await finish(player);
      expect(counter().props.accessibilityLabel).toBe('تم 4 من 8');
      await finish(player);
      expect(counterStore.get(id)).toBe(8);
      await waitFor(() =>
        expect(player.replace).toHaveBeenLastCalledWith({
          uri: localUri(adhkar[i + 1]!.audioFile!),
        }),
      );
    });

    it('after counting by hand, plays what is left and never counts past the count', async () => {
      const { id } = await openSaidFourTimes(true);
      await fireEvent(counter(), 'accessibilityAction', {
        nativeEvent: { actionName: 'activate' },
      });
      expect(counterStore.get(id)).toBe(1);
      const player = await start(); // 7 left: 2 plays (4, then the last 3)
      await finish(player);
      expect(counter().props.accessibilityLabel).toBe('تم 5 من 8');
      await finish(player);
      expect(counterStore.get(id)).toBe(8);
      expect(player.seekTo).toHaveBeenCalledTimes(1);
    });
  });

  it('with autoplay off, stops at the end of the recording', async () => {
    const { pos } = await openMorning((repos) => repos.settings.set('autoplayNext', false));
    await fireEvent.press(screen.getByLabelText(PLAY));
    await waitFor(() => expect(recitationPlayer()?.play).toHaveBeenCalled());
    const player = recitationPlayer()!;
    await act(async () => player.emit({ didJustFinish: true }));
    expect(player.replace).toHaveBeenCalledTimes(1);
    expect(screen.getByText(pos(0))).toBeOnTheScreen();
    expect(screen.getByLabelText(PLAY)).toBeOnTheScreen();
  });

  it('stops the recording when the user swipes to another dhikr', async () => {
    const { pos } = await openMorning();
    await fireEvent.press(screen.getByLabelText(PLAY));
    await waitFor(() => expect(recitationPlayer()?.play).toHaveBeenCalled());
    const player = recitationPlayer()!;
    const position = Number(pos(1).split(' ')[0]) - 1;
    const pager = screen.getByTestId('pager');
    const scroll = (pageScrollState: string) =>
      fireEvent(pager, 'pageScrollStateChanged', { nativeEvent: { pageScrollState } });
    await scroll('dragging');
    await fireEvent(pager, 'pageSelected', { nativeEvent: { position } });
    await scroll('idle');
    expect(screen.getByText(pos(1))).toBeOnTheScreen();
    expect(player.pause).toHaveBeenCalled();
    expect(player.replace).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(PLAY)).toBeOnTheScreen();
  });

  it('shows lock-screen controls only with background playback on', async () => {
    await openMorning();
    await fireEvent.press(screen.getByLabelText(PLAY));
    await waitFor(() =>
      expect(recitationPlayer()?.setActiveForLockScreen).toHaveBeenCalledWith(true, {
        title: 'أذكار الصباح',
        artist: 'وِرْدُك',
      }),
    );
  });

  it('never shows lock-screen controls with background playback off', async () => {
    await openMorning((repos) => repos.settings.set('backgroundPlayback', false));
    await fireEvent.press(screen.getByLabelText(PLAY));
    await waitFor(() => expect(recitationPlayer()?.play).toHaveBeenCalled());
    expect(recitationPlayer()!.setActiveForLockScreen).not.toHaveBeenCalled();
  });

  it("plays the user's own recording from their folder, without downloading", async () => {
    const repos = await createTestRepositories();
    const cat = await repos.custom.createCategory('أدعيتي');
    await repos.custom.createDhikr(cat.id, { text: 'نص', count: 1, audioFile: 'mine.m4a' });
    await repos.custom.createDhikr(cat.id, { text: 'بلا صوت', count: 1 });
    setRouteParams({ id: String(cat.id) });
    await renderWithApp(<ReaderScreen />, repos);
    await fireEvent.press(await screen.findByLabelText(PLAY));
    await waitFor(() =>
      expect(recitationPlayer()?.replace).toHaveBeenCalledWith({
        uri: 'file:///docs/custom-audio/mine.m4a',
      }),
    );
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

describe('Settings — audio', () => {
  it('shows the morning and evening size to download and opens the audio screen', async () => {
    const { repos } = await renderWithApp(<SettingsScreen />);
    const files = await repos.content.listAudioFiles('ar', [
      APP_CONFIG.content.morningCategoryId,
      APP_CONFIG.content.eveningCategoryId,
    ]);
    const mb = toMegabytes(files.reduce((n, f) => n + f.bytes, 0));
    expect(await screen.findByText('تحميل صوتيات الصباح والمساء')).toBeOnTheScreen();
    await fireEvent.press(await screen.findByText(`${mb} م.ب`));
    expect(mockRouter.push).toHaveBeenCalledWith('/audio');
  });

  it('turns "count with the audio" off (on by default, owner 2026-10-31)', async () => {
    const { repos } = await renderWithApp(<SettingsScreen />);
    const counts = await screen.findByLabelText('العدّ مع الصوت');
    expect(counts.props.value).toBe(true);
    expect(
      screen.getByText('كل مرة ينتهي فيها التسجيل تُحسب في العدّاد، ثم ينتقل إلى الذكر التالي'),
    ).toBeOnTheScreen();
    await fireEvent(counts, 'valueChange', false);
    await waitFor(async () =>
      expect(await repos.settings.getAll()).toMatchObject({ audioCounts: false }),
    );
  });

  it('by default each play counts: the counter goes up with the audio and the reader moves on', async () => {
    const repos = await createTestRepositories();
    const adhkar = await repos.content.listAdhkar(1, 'ar');
    const i = adhkar.findIndex(
      (d, j) => d.count >= 2 && d.count <= 7 && d.audioFile && adhkar[j + 1]?.audioFile,
    );
    const dhikr = adhkar[i]!;
    counterStore.resetMany(adhkar.map((d) => d.id));
    setRouteParams({ id: '1', dhikr: String(dhikr.id) });
    await renderWithApp(<ReaderScreen />, repos);
    await fireEvent.press(await screen.findByLabelText(PLAY));
    await waitFor(() => expect(recitationPlayer()?.play).toHaveBeenCalled());
    const player = recitationPlayer()!;
    await act(async () => player.emit({ didJustFinish: true }));
    expect(counterStore.get(dhikr.id)).toBe(1);
    for (let n = 2; n <= dhikr.count; n++)
      await act(async () => player.emit({ didJustFinish: true }));
    expect(counterStore.get(dhikr.id)).toBe(dhikr.count);
    await waitFor(() =>
      expect(player.replace).toHaveBeenLastCalledWith({ uri: localUri(adhkar[i + 1]!.audioFile!) }),
    );
  });

  it('turns background playback and autoplay off (both on by default)', async () => {
    const { repos } = await renderWithApp(<SettingsScreen />);
    const background = await screen.findByLabelText('التشغيل في الخلفية');
    const autoplay = screen.getByLabelText('التشغيل المتتابع');
    expect(background.props.value).toBe(true);
    expect(autoplay.props.value).toBe(true);
    await fireEvent(background, 'valueChange', false);
    await fireEvent(autoplay, 'valueChange', false);
    await waitFor(async () =>
      expect(await repos.settings.getAll()).toMatchObject({
        backgroundPlayback: false,
        autoplayNext: false,
      }),
    );
  });

  it('opens the privacy policy', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await renderWithApp(<SettingsScreen />);
    await fireEvent.press(await screen.findByText('سياسة الخصوصية'));
    expect(open).toHaveBeenCalledWith(APP_CONFIG.privacyPolicyUrl);
    open.mockRestore();
  });
});

describe('Audio downloads screen', () => {
  const MORNING_EVENING = [
    APP_CONFIG.content.morningCategoryId,
    APP_CONFIG.content.eveningCategoryId,
  ];
  const DOWNLOAD = /^تحميل صوتيات الصباح والمساء/;

  it('downloads the morning and evening recordings (their size from the database), then can delete them', async () => {
    const { repos } = await renderWithApp(<AudioDownloadsScreen />);
    const files = await repos.content.listAudioFiles('ar', MORNING_EVENING);
    const mb = toMegabytes(files.reduce((n, f) => n + f.bytes, 0));
    expect(await screen.findByText(`0 من ${files.length} ملفًا`)).toBeOnTheScreen();
    await fireEvent.press(screen.getByText(`تحميل صوتيات الصباح والمساء (${mb} م.ب)`));
    expect(
      await screen.findByText('صوتيات الصباح والمساء على هاتفك.', {}, { timeout: 5000 }),
    ).toBeOnTheScreen();
    expect(mockAudioStorage.downloads).toHaveLength(files.length);
    expect(screen.getByText(`${files.length} من ${files.length} ملفًا`)).toBeOnTheScreen();

    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _b, buttons) => {
      void buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });
    await fireEvent.press(screen.getByText('حذف الصوتيات المحمّلة'));
    expect(await screen.findByText(`0 من ${files.length} ملفًا`)).toBeOnTheScreen();
    expect(await repos.downloadedAudio.list('ar')).toEqual([]);
    alert.mockRestore();
  });

  it('offers to download only the rest after some files are there', async () => {
    const repos = await createTestRepositories();
    const [first] = await repos.content.listAudioFiles('ar', MORNING_EVENING);
    mockAudioStorage.preload('ar', first!.fileName);
    await renderWithApp(<AudioDownloadsScreen />, repos);
    expect(await screen.findByText(/^تحميل الباقي \(\d+ م\.ب\)$/)).toBeOnTheScreen();
  });

  it('can be stopped, and says it can continue later', async () => {
    mockAudioStorage.hold();
    await renderWithApp(<AudioDownloadsScreen />);
    await fireEvent.press(await screen.findByText(DOWNLOAD));
    await fireEvent.press(await screen.findByText('إيقاف التحميل'));
    await act(async () => mockAudioStorage.release());
    expect(await screen.findByText('توقّف التحميل. يمكنك استكماله متى شئت.')).toBeOnTheScreen();
    expect(screen.getByText(/^تحميل (صوتيات الصباح والمساء|الباقي)/)).toBeOnTheScreen();
  });

  it('says so when the phone is full, before downloading anything', async () => {
    mockAudioStorage.free = 1024;
    await renderWithApp(<AudioDownloadsScreen />);
    await fireEvent.press(await screen.findByText(DOWNLOAD));
    expect(await screen.findByText('لا توجد مساحة كافية على الهاتف.')).toBeOnTheScreen();
    expect(mockAudioStorage.downloads).toEqual([]);
  });

  it('"download every recording" stays in the code, hidden (owner, 2026-10-30)', async () => {
    await renderWithApp(<AudioDownloadsScreen />);
    expect(await screen.findByText(DOWNLOAD)).toBeOnTheScreen();
    expect(screen.queryByText(/^تحميل كل الصوتيات/)).toBeNull();
    expect(screen.queryByText('كل الأذكار')).toBeNull();
  });

  it('when shown again, it downloads every recording of the language', async () => {
    const shown = jest.replaceProperty(APP_CONFIG.audio, 'showDownloadAll', true);
    try {
      const { repos } = await renderWithApp(<AudioDownloadsScreen />);
      const all = await repos.content.listAudioFiles('ar');
      await fireEvent.press(await screen.findByText(/^تحميل كل الصوتيات \(\d+ م\.ب\)$/));
      expect(
        await screen.findByText('كل الصوتيات على هاتفك.', {}, { timeout: 5000 }),
      ).toBeOnTheScreen();
      expect(mockAudioStorage.downloads).toHaveLength(all.length);
      // The morning and evening ones are part of them.
      expect(screen.getByText('صوتيات الصباح والمساء على هاتفك.')).toBeOnTheScreen();
    } finally {
      shown.restore();
    }
  });

  it('deletes recordings downloaded by playing them, even with none of the morning and evening', async () => {
    const repos = await createTestRepositories();
    const morningEvening = new Set(
      (await repos.content.listAudioFiles('ar', MORNING_EVENING)).map((f) => f.fileName),
    );
    const other = (await repos.content.listAudioFiles('ar')).find(
      (f) => !morningEvening.has(f.fileName),
    )!;
    mockAudioStorage.preload('ar', other.fileName);
    await renderWithApp(<AudioDownloadsScreen />, repos);
    expect(await screen.findByText('حذف الصوتيات المحمّلة')).toBeOnTheScreen();
  });
});
