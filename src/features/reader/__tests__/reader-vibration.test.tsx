import * as Haptics from 'expo-haptics';

import { DHIKR } from '@/test-utils/fixtures/content';
import { openReader, tapCounter } from '@/test-utils/reader';

// The vibration is native: the check is what the reader asks of the phone.
describe('Reader — vibration when moving to the next dhikr', () => {
  it('none while counting', async () => {
    await openReader(DHIKR.raditu); // count 3
    await tapCounter();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('a strong one (stronger than a count) when the reader moves on', async () => {
    await openReader(DHIKR.raditu);
    for (let i = 0; i < 3; i++) await tapCounter();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy');
  });

  it('none when the setting is off', async () => {
    await openReader(DHIKR.raditu, {
      setup: (repos) => repos.settings.set('nextDhikrVibration', false),
    });
    for (let i = 0; i < 3; i++) await tapCounter();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });
});
