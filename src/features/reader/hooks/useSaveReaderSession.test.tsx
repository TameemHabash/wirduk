import { waitFor } from '@testing-library/react-native';

import { captureAppState } from '@/test-utils/app-state';
import { CATEGORY, DHIKR } from '@/test-utils/fixtures/content';
import { openReader, tapCounter } from '@/test-utils/reader';

describe('Reader — continue where I stopped', () => {
  let appState: ReturnType<typeof captureAppState>;
  beforeEach(() => {
    appState = captureAppState();
  });
  afterEach(() => appState.restore());

  it('saves the place and the counts when the app goes to the background', async () => {
    const { repos } = await openReader(DHIKR.hundredTimes);
    await tapCounter();
    await tapCounter();
    await appState.send('background');
    await waitFor(async () =>
      expect(await repos.session.load()).toMatchObject({
        categoryId: CATEGORY.morning,
        dhikrId: DHIKR.hundredTimes,
        counts: { [DHIKR.hundredTimes]: 2 },
      }),
    );
  });

  it('back in the app, the saved copy goes (the state is still in memory)', async () => {
    const { repos } = await openReader(DHIKR.hundredTimes);
    await tapCounter();
    await appState.send('background');
    await waitFor(async () => expect(await repos.session.load()).not.toBeNull());
    await appState.send('active');
    await waitFor(async () => expect(await repos.session.load()).toBeNull());
  });

  it('saves nothing when the setting is off', async () => {
    const { repos } = await openReader(DHIKR.hundredTimes, {
      setup: (r) => r.settings.set('restoreSession', false),
    });
    await tapCounter();
    await appState.send('background');
    expect(await repos.session.load()).toBeNull();
  });
});
