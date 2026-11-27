import { act, fireEvent, screen } from '@testing-library/react-native';

import { APP_CONFIG } from '@/config/app-config';
import { toMegabytes } from '@/features/audio/logic/audio-plan';
import { mockAudioStorage } from '@/test-utils/mocks/audio';
import { dialogButtons, openDialog, pressInDialog } from '@/test-utils/dialog';
import { createTestRepositories, renderWithApp } from '@/test-utils/render-app';

import { AudioDownloadsScreen } from './AudioDownloadsScreen';
import { tr } from '@/test-utils/tr';

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
      await screen.findByText(tr('audio.downloads.allDoneMorningEvening'), {}, { timeout: 5000 }),
    ).toBeOnTheScreen();
    expect(mockAudioStorage.downloads).toHaveLength(files.length);
    expect(screen.getByText(`${files.length} من ${files.length} ملفًا`)).toBeOnTheScreen();

    await fireEvent.press(screen.getByText(tr('audio.downloads.delete')));
    expect(openDialog().getByText(tr('audio.downloads.deleteConfirmTitle'))).toBeOnTheScreen();
    // A delete: the red button on top, cancel under it (redesign).
    expect(dialogButtons()).toEqual([tr('audio.downloads.deleteConfirm'), tr('common.cancel')]);
    await pressInDialog(tr('audio.downloads.deleteConfirm'));
    expect(await screen.findByText(`0 من ${files.length} ملفًا`)).toBeOnTheScreen();
    expect(await repos.downloadedAudio.list('ar')).toEqual([]);
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
    await fireEvent.press(await screen.findByText(tr('audio.downloads.cancel')));
    await act(async () => mockAudioStorage.release());
    expect(await screen.findByText(tr('audio.downloads.cancelled'))).toBeOnTheScreen();
    expect(screen.getByText(/^تحميل (صوتيات الصباح والمساء|الباقي)/)).toBeOnTheScreen();
  });

  it('says so when the phone is full, before downloading anything', async () => {
    mockAudioStorage.free = 1024;
    await renderWithApp(<AudioDownloadsScreen />);
    await fireEvent.press(await screen.findByText(DOWNLOAD));
    expect(await screen.findByText(tr('audio.errors.storage'))).toBeOnTheScreen();
    expect(mockAudioStorage.downloads).toEqual([]);
  });

  it('"download every recording" stays in the code, hidden (owner, 2026-10-30)', async () => {
    await renderWithApp(<AudioDownloadsScreen />);
    expect(await screen.findByText(DOWNLOAD)).toBeOnTheScreen();
    expect(screen.queryByText(/^تحميل كل الصوتيات/)).toBeNull();
    expect(screen.queryByText(tr('audio.downloads.everything'))).toBeNull();
  });

  it('when shown again, it downloads every recording of the language', async () => {
    const shown = jest.replaceProperty(APP_CONFIG.audio, 'showDownloadAll', true);
    try {
      const { repos } = await renderWithApp(<AudioDownloadsScreen />);
      const all = await repos.content.listAudioFiles('ar');
      await fireEvent.press(await screen.findByText(/^تحميل كل الصوتيات \(\d+ م\.ب\)$/));
      expect(
        await screen.findByText(tr('audio.downloads.allDone'), {}, { timeout: 5000 }),
      ).toBeOnTheScreen();
      expect(mockAudioStorage.downloads).toHaveLength(all.length);
      // The morning and evening ones are part of them.
      expect(screen.getByText(tr('audio.downloads.allDoneMorningEvening'))).toBeOnTheScreen();
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
    expect(await screen.findByText(tr('audio.downloads.delete'))).toBeOnTheScreen();
  });
});
