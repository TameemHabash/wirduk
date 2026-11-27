/** Settings: the audio rows (download size, «العدّ مع الصوت», background, autoplay, privacy). */
import { Linking } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { APP_CONFIG } from '@/config/app-config';
import { toMegabytes } from '@/features/audio/logic/audio-plan';
import { SettingsScreen } from '@/features/settings/screens/SettingsScreen';
import { renderWithApp } from '@/test-utils/render-app';
import { mockRouter } from '@/test-utils/mocks/router';
import { tr } from '@/test-utils/tr';

describe('Settings — audio', () => {
  it('shows the morning and evening size to download and opens the audio screen', async () => {
    const { repos } = await renderWithApp(<SettingsScreen />);
    const files = await repos.content.listAudioFiles('ar', [
      APP_CONFIG.content.morningCategoryId,
      APP_CONFIG.content.eveningCategoryId,
    ]);
    const mb = toMegabytes(files.reduce((n, f) => n + f.bytes, 0));
    expect(await screen.findByText(tr('settings.downloadAudio'))).toBeOnTheScreen();
    await fireEvent.press(await screen.findByText(`${mb} م.ب`));
    expect(mockRouter.push).toHaveBeenCalledWith('/audio');
  });

  it('turns "count with the audio" off (on by default, owner 2026-10-31)', async () => {
    const { repos } = await renderWithApp(<SettingsScreen />);
    const counts = await screen.findByLabelText(tr('settings.audioCounts'));
    expect(counts.props.value).toBe(true);
    expect(screen.getByText(tr('settings.audioCountsHint'))).toBeOnTheScreen();
    await fireEvent(counts, 'valueChange', false);
    await waitFor(async () =>
      expect(await repos.settings.getAll()).toMatchObject({ audioCounts: false }),
    );
  });

  it('turns background playback and autoplay off (both on by default)', async () => {
    const { repos } = await renderWithApp(<SettingsScreen />);
    const background = await screen.findByLabelText(tr('settings.backgroundPlayback'));
    const autoplay = screen.getByLabelText(tr('settings.autoplayNext'));
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
    await fireEvent.press(await screen.findByText(tr('settings.privacy')));
    expect(open).toHaveBeenCalledWith(APP_CONFIG.privacyPolicyUrl);
    open.mockRestore();
  });
});
