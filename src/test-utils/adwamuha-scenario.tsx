/**
 * Test-only: walks «أدومها» day by day with a fake clock, through the real
 * provider and repositories (the shipped content, a fresh user.db), so a test
 * can follow a whole plan as a user lives it: read the wards (or not), answer
 * the move-on question, take a break, turn it off... and check at any moment
 * what Home and «مساري» show (milestone 13: every state, owner 2026-10-30).
 */
import type { ReactElement } from 'react';
import { act } from '@testing-library/react-native';

import type { Repositories } from '@/data/DataProvider';
import { type AdwamuhaValue, useAdwamuha } from '@/features/adwamuha/AdwamuhaProvider';
import { type DayKey, addDays } from '@/features/adwamuha/logic/days';
import type { Session } from '@/features/adwamuha/logic/sessions';
import type { Weekday } from '@/features/adwamuha/logic/weeks';
import { type ProgressView, useProgress } from '@/features/adwamuha/useProgress';

import { createTestRepositories, renderWithApp } from './render-app';

/** How a day goes for one ward: read on time, read late, or not read. */
export type WardDay = boolean | 'late';

export interface DayPlan {
  morning: WardDay;
  evening: WardDay;
}

/** A local time on a day ('YYYY-MM-DD'). */
export function localTime(day: DayKey, hour: number, minute = 0): Date {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d, hour, minute);
}

export interface Scenario {
  repos: Repositories;
  /** The provider's value now. */
  readonly app: AdwamuhaValue;
  /** What «مساري» and the home card show now (null while off). */
  readonly view: ProgressView | null;
  /** Adwamuha's "today" (the open ward's date). */
  readonly today: DayKey;
  /** Moves the clock and lets the app catch up, as when it is opened. */
  setTime(day: DayKey, hour: number, minute?: number): Promise<void>;
  /** Runs an action of the app and waits for everything it starts. */
  run<T>(action: (app: AdwamuhaValue) => Promise<T>): Promise<T>;
  /** Reads a ward in the app now (the reader's own path: «إتمام» of the ward). */
  read(session: Session): Promise<void>;
  /**
   * Lives `days` days from the day after today, as `plan` says (both wards on
   * time by default), and opens the app each evening at 20:00 (`onEvening`
   * then runs, e.g. to answer a question). The wards are stored as the reader
   * stores them (morning at 07:00 or 13:00 when late, evening at 18:00 or
   * 01:30 the next night when late).
   */
  live(
    days: number,
    plan?: (date: DayKey, index: number) => DayPlan,
    onEvening?: (date: DayKey) => Promise<void> | void,
  ): Promise<void>;
  /** The same days, but the app is opened only at the end (20:00 of the last day). */
  away(days: number, plan?: (date: DayKey, index: number) => DayPlan): Promise<void>;
  /** The events the app logged, as `kind:step`. */
  events(): Promise<string[]>;
  /** Renders a real screen now, with the same data and clock (e.g. Home, «مساري»). */
  show(ui: ReactElement): Promise<void>;
}

const EVERY_DAY: DayPlan = { morning: true, evening: true };

/** Lets effects and the reads they start finish (e.g. a saved extension). */
async function settle() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/**
 * A scenario that begins on `day` at `hour` with «أدومها» turned on at
 * `step` (as the setup does). `weekStartsOn`: the setting (default Saturday).
 */
export async function startScenario({
  day,
  hour = 9,
  step = 1,
  weekStartsOn,
}: {
  day: DayKey;
  hour?: number;
  step?: number;
  weekStartsOn?: Weekday;
}): Promise<Scenario> {
  const clock = { at: localTime(day, hour) };
  const repos = await createTestRepositories();
  let app: AdwamuhaValue | null = null;
  let view: ProgressView | null = null;
  function Probe() {
    app = useAdwamuha();
    view = useProgress();
    return null;
  }
  await renderWithApp(<Probe />, repos, { now: () => clock.at, weekStartsOn });
  await settle();

  const current = () => {
    if (!app) throw new Error('The app is not rendered');
    return app;
  };
  const run = async <T,>(action: (value: AdwamuhaValue) => Promise<T>) => {
    let result!: T;
    await act(async () => {
      result = await action(current());
    });
    await settle();
    return result;
  };
  const setTime = async (d: DayKey, h: number, minute = 0) => {
    clock.at = localTime(d, h, minute);
    await run((value) => value.reload());
  };
  /** Stores a day's wards as the reader would (without opening the app). */
  const store = async (date: DayKey, p: DayPlan) => {
    const step = current().stored?.state.step ?? 1;
    for (const session of ['morning', 'evening'] as const) {
      const ward = p[session];
      if (!ward) continue;
      const late = ward === 'late';
      const at =
        session === 'morning'
          ? localTime(date, late ? 13 : 7)
          : late
            ? localTime(addDays(date, 1), 1, 30)
            : localTime(date, 18);
      await repos.adwamuha.addRecord({
        date,
        session,
        completedAt: at.getTime(),
        late,
        source: 'reader',
        step,
      });
    }
  };

  const scenario: Scenario = {
    repos,
    get app() {
      return current();
    },
    get view() {
      return view;
    },
    get today() {
      return current().slot().date;
    },
    setTime,
    run,
    async read(session) {
      await run((value) => value.completeWard(session));
    },
    async live(days, plan = () => EVERY_DAY, onEvening) {
      for (let i = 0; i < days; i++) {
        const date = addDays(scenario.today, 1);
        await store(date, plan(date, i));
        await setTime(date, 20);
        await onEvening?.(date);
      }
    },
    async away(days, plan = () => EVERY_DAY) {
      let date = scenario.today;
      for (let i = 0; i < days; i++) {
        date = addDays(date, 1);
        await store(date, plan(date, i));
      }
      await setTime(date, 20);
    },
    async events() {
      return (await repos.adwamuha.listEvents()).map((e) => `${e.kind}:${e.step ?? ''}`);
    },
    async show(ui) {
      const at = clock.at;
      await renderWithApp(ui, repos, { now: () => at, weekStartsOn });
      await settle();
    },
  };
  if (step > 0) await run((value) => value.start(step));
  return scenario;
}
