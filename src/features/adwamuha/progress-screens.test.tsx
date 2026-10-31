import { Alert, type AlertButton } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import type { Repositories } from '@/data/DataProvider';
import { HomeScreen } from '@/features/home/HomeScreen';
import { afterMessages } from '@/test-utils/adwamuha-messages';
import { createTestRepositories, renderWithApp, settleLists } from '@/test-utils/render-app';
import { mockRouter } from '@/test-utils/router-mock';

import { addDays } from './logic/days';
import { startPlan } from './logic/progress';
import type { Session } from './logic/sessions';
import { copyDefaultPlan } from './logic/ward';
import { OWNER_TEXTS } from './owner-texts';
import { ProgressScreen } from './ProgressScreen';

const DAY = '2026-02-10';
/** A local time on 2026-02-10 (day 10) or the next day (11). */
const at =
  (hh: number, mm = 0, d = 10) =>
  () =>
    new Date(2026, 1, d, hh, mm);
const stepText = (step: number) =>
  OWNER_TEXTS.labels.stepOf.replace('{{step}}', String(step)).replace('{{total}}', '24');

/** The feature on: the default plan at step 1, started `daysAgo` days before DAY. */
async function withPlan(daysAgo = 0, enabled = true): Promise<Repositories> {
  const repos = await createTestRepositories();
  const plan = copyDefaultPlan(await repos.content.getDefaultPlan('ar'));
  const startedOn = addDays(DAY, -daysAgo);
  await repos.adwamuha.save({
    enabled,
    plan,
    state: startPlan(1, startedOn),
    startedOn,
    offSince: null,
  });
  return repos;
}

async function read(repos: Repositories, date: string, session: Session) {
  await repos.adwamuha.addRecord({
    date,
    session,
    completedAt: 1,
    late: false,
    source: 'reader',
    step: 1,
  });
}

/** Both wards on each of the `n` days before DAY. */
async function readDaysBefore(repos: Repositories, n: number) {
  for (let i = 1; i <= n; i++) {
    await read(repos, addDays(DAY, -i), 'morning');
    await read(repos, addDays(DAY, -i), 'evening');
  }
}

// Home's list draws more rows on a timer: let it finish inside the test.
afterEach(async () => {
  await settleLists();
});

describe('Home: «وردك اليوم»', () => {
  it('is not there while the feature is off', async () => {
    await renderWithApp(<HomeScreen />, await withPlan(0, false), { now: at(7) });
    await screen.findByText('كل الأذكار');
    expect(screen.queryByText(OWNER_TEXTS.labels.todayWard)).toBeNull();
  });

  it("in the morning: the step, the hadith, today, one button and the ward's size", async () => {
    await renderWithApp(<HomeScreen />, await withPlan(), { now: at(7) });
    expect(await screen.findByText(OWNER_TEXTS.labels.todayWard)).toBeOnTheScreen();
    expect(screen.getByText(stepText(1))).toBeOnTheScreen();
    expect(screen.getByText(OWNER_TEXTS.hadith.text)).toBeOnTheScreen();
    expect(screen.getByLabelText('الصباح: وقته الآن')).toBeOnTheScreen();
    expect(screen.getByLabelText('المساء: لم يحن بعد')).toBeOnTheScreen();
    expect(screen.getByText('ذكران في وردك')).toBeOnTheScreen();
    // The full adhkar stay below, quiet (no "الآن"), under «الصباح والمساء» (owner, 2026-10-30).
    expect(screen.getByText('الصباح والمساء')).toBeOnTheScreen();
    expect(screen.queryByText('الآن')).toBeNull();
    await fireEvent.press(screen.getByText('افتح ورد الصباح'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/adwamuha/ward/[session]',
      params: { session: 'morning' },
    });
  });

  it('once the morning is done: when the evening starts', async () => {
    const repos = await withPlan();
    await read(repos, DAY, 'morning');
    await renderWithApp(<HomeScreen />, repos, { now: at(9) });
    expect(await screen.findByText('يبدأ ورد المساء الساعة 4:00 م')).toBeOnTheScreen();
    expect(screen.getByText('تم')).toBeOnTheScreen();
  });

  it("both wards done: only the owner's prayer, no button", async () => {
    const repos = await withPlan();
    await read(repos, DAY, 'morning');
    await read(repos, DAY, 'evening');
    const prayer = (await repos.content.listAdwamuhaTexts('ar')).find(
      (x) => x.id === 'owner:bothDone',
    )!.text;
    await renderWithApp(<HomeScreen />, repos, { now: at(19) });
    expect(await screen.findByText(prayer)).toBeOnTheScreen();
    expect(screen.getByLabelText('المساء: تم')).toBeOnTheScreen();
    expect(screen.queryByText('افتح ورد المساء')).toBeNull();
    expect(screen.queryByText(/في وردك$/)).toBeNull();
  });

  it('13:00 with the morning not done: still the morning ward (it counts, late)', async () => {
    await renderWithApp(<HomeScreen />, await withPlan(), { now: at(13) });
    expect(await screen.findByText('افتح ورد الصباح')).toBeOnTheScreen();
  });

  it("01:30: last night's evening ward if not done", async () => {
    await renderWithApp(<HomeScreen />, await withPlan(), { now: at(1, 30, 11) });
    expect(await screen.findByText('افتح ورد المساء')).toBeOnTheScreen();
  });

  it('opens «مساري»', async () => {
    await renderWithApp(<HomeScreen />, await withPlan(), { now: at(7) });
    await fireEvent.press(await screen.findByLabelText(OWNER_TEXTS.labels.progressTitle));
    expect(mockRouter.push).toHaveBeenCalledWith('/adwamuha');
  });
});

describe('moving on', () => {
  it('asks «جاهز لإضافة الذكر التالي؟» in «وردك اليوم» until answered; «أضِف الذكر التالي» starts step 2', async () => {
    const repos = await withPlan(28);
    await readDaysBefore(repos, 28);
    await renderWithApp(<HomeScreen />, repos, { now: at(7) });
    // The messages due (the stage tip, the end of the week) come first.
    await afterMessages(OWNER_TEXTS.labels.readyQuestion);
    expect(screen.getByText(OWNER_TEXTS.labels.keepWeek)).toBeOnTheScreen();
    await fireEvent.press(screen.getByText(OWNER_TEXTS.labels.addNext));
    await waitFor(async () => expect((await repos.adwamuha.load())?.state.step).toBe(2));
    expect((await repos.adwamuha.load())?.state.stepStartedOn).toBe(DAY);
    expect((await repos.adwamuha.listEvents()).map((e) => e.kind)).toEqual(['advance']);
    await waitFor(() => expect(screen.queryByText(OWNER_TEXTS.labels.readyQuestion)).toBeNull());
  });
  it('«أبقِني أسبوعًا آخر» asks again a week later', async () => {
    const repos = await withPlan(28);
    await readDaysBefore(repos, 28);
    await renderWithApp(<ProgressScreen />, repos, { now: at(7) });
    await fireEvent.press(await screen.findByText(OWNER_TEXTS.labels.keepWeek));
    await waitFor(async () =>
      expect((await repos.adwamuha.load())?.state.askAgainOn).toBe(addDays(DAY, 7)),
    );
    expect(screen.queryByText(OWNER_TEXTS.labels.readyQuestion)).toBeNull();
  });

  it('adds a week by itself when the time is up but the days were too few', async () => {
    const repos = await withPlan(28);
    await read(repos, addDays(DAY, -1), 'morning');
    await renderWithApp(<ProgressScreen />, repos, { now: at(7) });
    await waitFor(async () => expect((await repos.adwamuha.load())?.state.extraWeeks).toBe(1));
    expect((await repos.adwamuha.listEvents()).map((e) => [e.kind, e.data])).toEqual([
      ['extend', { weeks: 1 }],
    ]);
    expect(await screen.findByText('باقي 7 أيام على الأقل في هذه الخطوة.')).toBeOnTheScreen();
  });
});

describe('«مساري»', () => {
  it('the ring, the stage, the days left, the hadith, the week and its goal bars (no percentages)', async () => {
    const repos = await withPlan(10);
    for (let i = 1; i <= 7; i++) await read(repos, addDays(DAY, -i), 'morning');
    for (let i = 1; i <= 3; i++) await read(repos, addDays(DAY, -i), 'evening');
    const stage1 = (await repos.content.getDefaultPlan('ar')).stages[0]!.title;
    await renderWithApp(<ProgressScreen />, repos, { now: at(7) });
    expect(await screen.findByLabelText(stepText(1))).toBeOnTheScreen();
    expect(await screen.findByText(`المرحلة الأولى · ${stage1}`)).toBeOnTheScreen();
    // 28 days: days 0–9 of the step are over (today is not judged yet).
    expect(screen.getByText('باقي 18 يومًا على الأقل في هذه الخطوة.')).toBeOnTheScreen();
    expect(screen.getByText(OWNER_TEXTS.hadith.text)).toBeOnTheScreen();
    expect(screen.getByText('تتبّع الأسبوع')).toBeOnTheScreen();
    // This calendar week (from Saturday, the setting's default): Saturday to Monday so far,
    // the same days as the dots.
    expect(screen.getByText('هدف هذا الأسبوع · شرط الانتقال')).toBeOnTheScreen();
    // A line before the goal (owner, 2026-10-30).
    expect(screen.getByTestId('goal-divider')).toBeOnTheScreen();
    expect(screen.getByLabelText('الصباح: 3 من 4')).toBeOnTheScreen();
    expect(screen.getByLabelText('المساء: 3 من 4')).toBeOnTheScreen();
    expect(screen.getByLabelText('الاثنين، الصباح: تم')).toBeOnTheScreen();
    expect(screen.getByLabelText('اليوم، الصباح: لم يُقرأ بعد')).toBeOnTheScreen();
    expect(screen.queryByText(/%/)).toBeNull();
    expect(screen.queryByText('لماذا خطة خفيفة؟')).toBeNull();
  });

  it('a week the step began in: the goal in words instead of the bars', async () => {
    await renderWithApp(<ProgressScreen />, await withPlan(1), { now: at(7) });
    expect(await screen.findByText(/^هدفك: ٤ أيام من ٧/)).toBeOnTheScreen();
    expect(screen.queryByText('هدف هذا الأسبوع · شرط الانتقال')).toBeNull();
  });

  it('«قرأتُ وردي بدون التطبيق»: only the wards not recorded; a tap records, a ✓ tapped undoes', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const repos = await withPlan(3);
    await read(repos, addDays(DAY, -1), 'evening');
    await renderWithApp(<ProgressScreen />, repos, { now: at(7) });
    await fireEvent.press(await screen.findByText('قرأتُ وردي بدون التطبيق'));
    // Today's evening has not begun; yesterday's evening was read in the app.
    expect(screen.getByLabelText('ورد الصباح، اليوم')).toBeOnTheScreen();
    expect(screen.getByLabelText('ورد الصباح، أمس')).toBeOnTheScreen();
    expect(screen.queryByLabelText('ورد المساء، اليوم')).toBeNull();
    expect(screen.queryByLabelText('ورد المساء، أمس')).toBeNull();
    await fireEvent.press(screen.getByLabelText('ورد الصباح، اليوم'));
    await waitFor(async () =>
      expect(await repos.adwamuha.listRecords()).toContainEqual(
        expect.objectContaining({ date: DAY, session: 'morning', source: 'manual' }),
      ),
    );
    // Recorded by the user: its ✓ can be undone, after a yes.
    await fireEvent.press(
      await screen.findByLabelText('اليوم، الصباح: سجّلتَه بنفسك، اضغط للإلغاء'),
    );
    const buttons = alert.mock.calls[0]![2] as AlertButton[];
    await act(async () => buttons[1]!.onPress!());
    await waitFor(async () =>
      expect((await repos.adwamuha.listRecords()).some((r) => r.date === DAY)).toBe(false),
    );
    alert.mockRestore();
  });

  it("yesterday's empty dot records it after a yes; older days only say so", async () => {
    const repos = await withPlan(3);
    await renderWithApp(<ProgressScreen />, repos, { now: at(7) });
    await fireEvent.press(await screen.findByLabelText('الاثنين، المساء: سجّل أمس'));
    expect(screen.getByText('سجّل المساء أمس')).toBeOnTheScreen();
    expect(screen.getByText('قرأتَ ورد المساء يوم الاثنين من حفظك؟')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('نعم، سجّله'));
    await waitFor(async () =>
      expect(await repos.adwamuha.listRecords()).toContainEqual(
        expect.objectContaining({ date: addDays(DAY, -1), session: 'evening', source: 'manual' }),
      ),
    );
    await fireEvent.press(screen.getByLabelText('الأحد، الصباح: لم يُقرأ'));
    expect(await screen.findByText('يمكن التسجيل لليوم أو أمس فقط')).toBeOnTheScreen();
  });

  it('nothing left to record: a kind line', async () => {
    const repos = await withPlan(3);
    await read(repos, DAY, 'morning');
    await read(repos, addDays(DAY, -1), 'morning');
    await read(repos, addDays(DAY, -1), 'evening');
    await renderWithApp(<ProgressScreen />, repos, { now: at(9) });
    await fireEvent.press(await screen.findByText('قرأتُ وردي بدون التطبيق'));
    expect(screen.getByText(/^لا شيء لتسجيله/)).toBeOnTheScreen();
  });

  it('says so when the feature is off', async () => {
    await renderWithApp(<ProgressScreen />, await withPlan(0, false), { now: at(7) });
    expect(await screen.findByText('«أدومها» غير مفعّلة.')).toBeOnTheScreen();
  });
});
