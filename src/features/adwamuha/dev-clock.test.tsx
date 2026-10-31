import { act, waitFor } from '@testing-library/react-native';

import DevClock from '@/app/dev-clock';
import { createTestRepositories, renderWithApp } from '@/test-utils/render-app';
import { mockRouter, setRouteParams } from '@/test-utils/router-mock';

import { devNow, onDevClock, setDevClock } from './dev-clock';
import { addDays } from './logic/days';
import { startPlan } from './logic/progress';
import { DEFAULT_WARD_TIMES, slotAt } from './logic/sessions';
import { copyDefaultPlan } from './logic/ward';

afterEach(() => {
  setDevClock(new Date()); // back to the real time
});

describe('the dev clock (dev builds only, milestone 13)', () => {
  it('is the real time until moved, then tells the app', () => {
    expect(Math.abs(devNow().getTime() - Date.now())).toBeLessThan(1000);
    const moved = jest.fn();
    const stop = onDevClock(moved);
    const target = new Date(2027, 0, 10, 20, 0);
    setDevClock(target);
    expect(moved).toHaveBeenCalledTimes(1);
    expect(Math.abs(devNow().getTime() - target.getTime())).toBeLessThan(1000);
    stop();
    setDevClock(new Date());
    expect(moved).toHaveBeenCalledTimes(1);
  });

  it('wirduk://dev-clock?days=8&read=4: moves 8 days ahead and stores 4 of the 7 days skipped', async () => {
    const repos = await createTestRepositories();
    const today = new Date();
    // «أدومها»'s today: before the morning starts (04:00) it is still the day before.
    const day = slotAt(today, DEFAULT_WARD_TIMES).date;
    await repos.adwamuha.save({
      enabled: true,
      plan: copyDefaultPlan(await repos.content.getDefaultPlan('ar')),
      state: startPlan(1, day),
      startedOn: day,
      offSince: null,
    });
    setRouteParams({ days: '8', hour: '20', read: '4' });
    // No `now`: the app's own clock, which the route moves.
    await renderWithApp(<DevClock />, repos);
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    await act(async () => undefined);
    const dates = [...new Set((await repos.adwamuha.listRecords()).map((r) => r.date))].sort();
    // The days after today and before the new day: 1–7; the first 4 are read.
    expect(dates).toHaveLength(4);
    const moved = devNow();
    expect(moved.getHours()).toBe(20);
    expect(slotAt(moved, DEFAULT_WARD_TIMES).date).toBe(addDays(day, 8));
    expect(dates.every((d) => d > day && d < addDays(day, 8))).toBe(true);
  });
});
