import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import { DHIKR } from '@/test-utils/fixtures/content';
import { openReader } from '@/test-utils/reader';

// The phone's screen lock is native: the check is what the reader asks of it.
describe('Reader — keep the screen on', () => {
  it('keeps the screen on while open (on by default)', async () => {
    await openReader(DHIKR.hundredTimes);
    expect(activateKeepAwakeAsync).toHaveBeenCalledWith('wirduk-reader');
  });

  it('lets the screen sleep once the reader is closed', async () => {
    const { view } = await openReader(DHIKR.hundredTimes);
    await view.unmount();
    expect(deactivateKeepAwake).toHaveBeenCalledWith('wirduk-reader');
  });

  it('does nothing when the setting is off', async () => {
    await openReader(DHIKR.hundredTimes, {
      setup: (repos) => repos.settings.set('keepScreenOn', false),
    });
    expect(activateKeepAwakeAsync).not.toHaveBeenCalled();
  });
});
