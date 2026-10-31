import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import type { Repositories } from '@/data/DataProvider';
import { HomeScreen } from '@/features/home/HomeScreen';
import { expectMomentMessage, stateText } from '@/test-utils/adwamuha-messages';
import { createTestRepositories, renderWithApp, settleLists } from '@/test-utils/render-app';

import { AdwamuhaSettingsScreen } from './AdwamuhaSettingsScreen';
import { addDays } from './logic/days';
import { startPlan } from './logic/progress';
import type { Session } from './logic/sessions';
import { copyDefaultPlan } from './logic/ward';
import { weekdayOf } from './logic/weeks';
import { OWNER_TEXTS } from './owner-texts';
import { ProgressScreen } from './ProgressScreen';

const DAY = '2026-05-12';
const at = (hh: number) => () => new Date(2026, 4, 12, hh, 0);
/** Calendar weeks that start on the day a plan begun 7 days ago began: its first week is over. */
const stepWeek = weekdayOf(addDays(DAY, -7));

afterEach(async () => {
  await settleLists();
});

/** On at `step`, started `daysAgo` days ago; `seen`: messages already shown. */
async function withPlan(step: number, daysAgo: number, seen: string[] = []): Promise<Repositories> {
  const repos = await createTestRepositories();
  const plan = copyDefaultPlan(await repos.content.getDefaultPlan('ar'));
  const startedOn = addDays(DAY, -daysAgo);
  await repos.adwamuha.save({
    enabled: true,
    plan,
    state: startPlan(step, startedOn),
    startedOn,
    offSince: null,
  });
  for (const key of seen) await repos.adwamuha.markShown(key);
  return repos;
}

async function read(repos: Repositories, daysAgo: number, session: Session) {
  await repos.adwamuha.addRecord({
    date: addDays(DAY, -daysAgo),
    session,
    completedAt: 1,
    late: false,
    source: 'reader',
    step: 1,
  });
}

describe("the owner's messages, each once (on Home only)", () => {
  it("a stage's tip when it begins; «حسنًا» puts it away, and «مساري» keeps it to read", async () => {
    const repos = await withPlan(1, 0);
    const tip = await stateText(repos, 'tip', 'stage:1');
    await renderWithApp(<HomeScreen />, repos, { now: at(9) });
    expect(await screen.findByText(tip)).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('حسنًا'));
    await waitFor(() => expect(screen.queryByText(tip)).toBeNull());
    expect(await repos.adwamuha.wasShown('tip:1')).toBe(true);
    await renderWithApp(<ProgressScreen />, repos, { now: at(9) });
    expect(await screen.findByText(tip)).toBeOnTheScreen();
    expect(screen.queryByText('حسنًا')).toBeNull();
  });

  it('the end of a week: the target reached, or a kind word', async () => {
    const good = await withPlan(1, 7, ['tip:1']);
    for (let d = 1; d <= 7; d++) await read(good, d, 'morning');
    for (let d = 1; d <= 4; d++) await read(good, d, 'evening');
    await renderWithApp(<HomeScreen />, good, { now: at(9), weekStartsOn: stepWeek });
    await expectMomentMessage(good, 'weekReached');
  });

  it('the end of a week below the target', async () => {
    const thin = await withPlan(1, 7, ['tip:1']);
    await read(thin, 1, 'morning');
    await renderWithApp(<HomeScreen />, thin, { now: at(9), weekStartsOn: stepWeek });
    await expectMomentMessage(thin, 'weekBelow');
  });

  it('a new week start cuts the weeks again, with no end-of-week message for that (owner, 2026-10-30)', async () => {
    // Begun on Tuesday 28 April; the week from Saturday 2 May was over and its word shown.
    const repos = await withPlan(1, 14, ['tip:1', 'week:1:2026-04-28:2026-05-02']);
    for (let d = 1; d <= 14; d++) {
      await read(repos, d, 'morning');
      await read(repos, d, 'evening');
    }
    await renderWithApp(<AdwamuhaSettingsScreen />, repos, { now: at(9) });
    await fireEvent.press(await screen.findByRole('radio', { name: 'الأحد' }));
    await waitFor(async () => expect((await repos.settings.getAll()).weekStart).toBe(0));
    // The week from Sunday 3 May is over too, but it is no news.
    expect(await repos.adwamuha.wasShown('week:1:2026-04-28:2026-05-03')).toBe(true);
    await renderWithApp(<HomeScreen />, repos, { now: at(9) });
    await screen.findByText(OWNER_TEXTS.labels.todayWard);
    expect(screen.queryByText('حسنًا')).toBeNull();
  });

  it('a new step: a word on Home right after «أضِف الذكر التالي»', async () => {
    const repos = await withPlan(1, 28, ['tip:1']); // stage 1: 4 weeks
    for (let d = 1; d <= 28; d++) {
      await read(repos, d, 'morning');
      await read(repos, d, 'evening');
    }
    await renderWithApp(<ProgressScreen />, repos, { now: at(9) });
    await fireEvent.press(await screen.findByText(OWNER_TEXTS.labels.addNext));
    await waitFor(async () => expect((await repos.adwamuha.load())?.state.step).toBe(2));
    await renderWithApp(<HomeScreen />, repos, { now: at(9) });
    await expectMomentMessage(repos, 'newStep');
  });

  it('no word for a new step or a step back days later', async () => {
    const repos = await withPlan(2, 3, ['tip:1']);
    await repos.adwamuha.logEvent(addDays(DAY, -3), 'advance', 2);
    await repos.adwamuha.logEvent(addDays(DAY, -2), 'break', 2);
    await renderWithApp(<HomeScreen />, repos, { now: at(9) });
    expect(await screen.findByText(OWNER_TEXTS.labels.todayWard)).toBeOnTheScreen();
    expect(screen.queryByText('حسنًا')).toBeNull();
  });

  it('after an automatic extension', async () => {
    const repos = await withPlan(1, 28, ['tip:1']);
    await renderWithApp(<HomeScreen />, repos, { now: at(9) });
    await expectMomentMessage(repos, 'extended');
  });

  it('the end of the path: a message, then keep it on or turn it off (once)', async () => {
    const repos = await withPlan(24, 28, ['tip:4']);
    for (let d = 1; d <= 28; d++) {
      await read(repos, d, 'morning');
      await read(repos, d, 'evening');
    }
    await renderWithApp(<HomeScreen />, repos, { now: at(9) });
    await expectMomentMessage(repos, 'finished');
    await waitFor(async () => expect((await repos.adwamuha.load())?.state.maintenance).toBe(true));
    await fireEvent.press(screen.getByText('أوقف «أدومها»'));
    await waitFor(async () => expect((await repos.adwamuha.load())?.enabled).toBe(false));
  });
});
describe('texts chosen by state (content database)', () => {
  it.each([
    [1, 'evening', 'first:evening', 18],
    [1, 'morning', 'first:morning', 9],
    [5, 'morning', 'later:morning', 9],
  ] as const)(
    'right after turning it on at step %i in the %s: the welcome for %s, once',
    async (step, session, state, hh) => {
      const repos = await createTestRepositories();
      const plan = copyDefaultPlan(await repos.content.getDefaultPlan('ar'));
      await repos.adwamuha.save({
        enabled: true,
        plan,
        state: startPlan(step, DAY, session),
        startedOn: DAY,
        offSince: null,
      });
      await repos.adwamuha.logEvent(DAY, 'start', step);
      const welcome = await stateText(repos, 'welcome', state);
      await renderWithApp(<HomeScreen />, repos, { now: at(hh) });
      expect(await screen.findByText(welcome)).toBeOnTheScreen();
      await fireEvent.press(screen.getByText('حسنًا'));
      await waitFor(() => expect(screen.queryByText(welcome)).toBeNull());
    },
  );

  it('no welcome days after turning it on', async () => {
    const repos = await withPlan(1, 3, ['tip:1']);
    await repos.adwamuha.logEvent(addDays(DAY, -3), 'start', 1);
    await renderWithApp(<HomeScreen />, repos, { now: at(9) });
    await screen.findByText(OWNER_TEXTS.labels.todayWard);
    expect(screen.queryByText('حسنًا')).toBeNull();
  });

  it('after the last step: the maintenance tip', async () => {
    const repos = await createTestRepositories();
    const plan = copyDefaultPlan(await repos.content.getDefaultPlan('ar'));
    const startedOn = addDays(DAY, -200);
    await repos.adwamuha.save({
      enabled: true,
      plan,
      state: { ...startPlan(24, startedOn), maintenance: true },
      startedOn,
      offSince: null,
    });
    const tip = await stateText(repos, 'tip', 'maintenance');
    await renderWithApp(<ProgressScreen />, repos, { now: at(9) });
    expect((await screen.findAllByText(tip)).length).toBeGreaterThan(0);
  });
});

describe('«مساري»: the hadith', () => {
  it('featured, with no source line and no Dorar link', async () => {
    await renderWithApp(<ProgressScreen />, await withPlan(1, 0, ['tip:1']), { now: at(9) });
    expect(await screen.findByText(OWNER_TEXTS.hadith.text)).toBeOnTheScreen();
    // No source line and no Dorar link (owner, 2026-10-29).
    expect(screen.queryByText(OWNER_TEXTS.hadith.source)).toBeNull();
    expect(screen.queryByText('عرض في الدرر السنية')).toBeNull();
  });
});
