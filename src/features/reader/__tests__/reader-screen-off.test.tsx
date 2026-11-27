/**
 * With the screen off (Android), JS timers wait until it is on again: the reader must move on
 * and play the next recording without them (CLAUDE.md, "Traps").
 */
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { screenOff } from '@/test-utils/app-state';
import { DHIKR } from '@/test-utils/fixtures/content';
import { finishPlaying, recordingUri, recordingsHeard } from '@/test-utils/mocks/audio';
import { openReader } from '@/test-utils/reader';
import { tr } from '@/test-utils/tr';

describe('Reader — screen off', () => {
  it('with "count with the audio", moves on and plays the next dhikr at once', async () => {
    const { adhkar, placeOf } = await openReader(DHIKR.raditu, {
      setup: (repos) => repos.settings.set('audioCounts', true),
    });
    const next = adhkar[adhkar.findIndex((d) => d.id === DHIKR.raditu) + 1]!;
    await fireEvent.press(screen.getByLabelText(tr('audio.play')));
    await waitFor(() => expect(recordingsHeard()).toHaveLength(1));
    const off = screenOff();
    try {
      for (let n = 0; n < 3; n++) await finishPlaying(); // count 3: three plays
      // No waiting for timers (they sleep with the screen off): already on the next one.
      expect(screen.getByText(placeOf(next.id))).toBeOnTheScreen();
      await waitFor(() => expect(recordingsHeard().at(-1)).toBe(recordingUri(next.audioFile!)));
    } finally {
      off.restore();
    }
  });
});
