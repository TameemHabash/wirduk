import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { SESSION_MAX_AGE_MS } from '@/data/session';
import { counterStore } from '@/features/counter/counter-store';
import { HomeScreen } from '@/features/home/HomeScreen';
import { createTestRepositories, renderWithApp } from '@/test-utils/render-app';
import { mockRouter } from '@/test-utils/router-mock';

const RESTORED = 'استُعيدت آخر حالة، ويمكنك إيقاف ذلك من الإعدادات';
const SAVED = { categoryId: 1, dhikrId: 1017, counts: { '1017': 40, '1013': 3 } };

async function startWith(opts: { ageMs?: number; restoreSession?: boolean } = {}) {
  const repos = await createTestRepositories();
  if (opts.restoreSession === false) await repos.settings.set('restoreSession', false);
  const now = Date.now();
  const clock = jest.spyOn(Date, 'now').mockReturnValue(now - (opts.ageMs ?? 60_000));
  await repos.session.save(SAVED);
  clock.mockRestore();
  counterStore.resetMany([1013, 1017]);
  await renderWithApp(<HomeScreen />, repos);
  return repos;
}

describe('Continue where I stopped — app start', () => {
  it('reopens the reader at the same dhikr with the same counts, and says so', async () => {
    const repos = await startWith();
    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/category/[id]',
        params: { id: '1', dhikr: '1017' },
      }),
    );
    expect(counterStore.get(1017)).toBe(40);
    expect(counterStore.get(1013)).toBe(3);
    expect(await screen.findByText(RESTORED)).toBeOnTheScreen();
    expect(await repos.session.load()).toBeNull(); // used once
    // The toast leads to the setting.
    await fireEvent.press(screen.getByText(RESTORED));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/settings');
  });

  it('starts fresh after more than 5 hours', async () => {
    const repos = await startWith({ ageMs: SESSION_MAX_AGE_MS + 60_000 });
    await waitFor(async () => expect(await repos.session.load()).toBeNull());
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(counterStore.get(1017)).toBe(0);
    expect(screen.queryByText(RESTORED)).toBeNull();
  });

  it('reopens an Adwamuha ward as the ward', async () => {
    const repos = await createTestRepositories();
    await repos.session.save({ ...SAVED, ward: 'morning' });
    counterStore.resetMany([1013, 1017]);
    await renderWithApp(<HomeScreen />, repos);
    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/adwamuha/ward/[session]',
        params: { session: 'morning', dhikr: '1017' },
      }),
    );
    expect(counterStore.get(1017)).toBe(40);
  });

  it('starts fresh when the setting is off', async () => {
    const repos = await startWith({ restoreSession: false });
    await waitFor(async () => expect(await repos.session.load()).toBeNull());
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});
