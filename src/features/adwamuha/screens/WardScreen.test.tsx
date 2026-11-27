import { Text } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import type { Repositories } from '@/data/DataProvider';
import { counterStore } from '@/features/reader/state/counter-store';
import { momentSnippets, snippetOf } from '@/test-utils/adwamuha-messages';
import { startScenario } from '@/test-utils/adwamuha-scenario';
import { createTestRepositories, renderWithApp } from '@/test-utils/render-app';
import { mockRouter, setRouteParams } from '@/test-utils/router-mock';

import { useAdwamuha } from '@/features/adwamuha/state/AdwamuhaProvider';
import { addDays } from '@/features/adwamuha/logic/days';
import { messagePool } from '@/features/adwamuha/logic/messages';
import { startPlan } from '@/features/adwamuha/logic/progress';
import { copyDefaultPlan } from '@/features/adwamuha/logic/ward';
import { WardDoneScreen } from './WardDoneScreen';
import { WardScreen } from './WardScreen';

const DAY = '2026-01-15';
/** A local time on 2026-01-15. */
const at =
  (hh: number, mm = 0) =>
  () =>
    new Date(2026, 0, 15, hh, mm);
const completeButton = () => screen.getByLabelText('إتمام هذا الذكر والانتقال إلى التالي');

/** The feature on, at `step` (from the default plan), and nothing read yet. */
async function withPlan(step = 1, enabled = true) {
  const repos = await createTestRepositories();
  const plan = copyDefaultPlan(await repos.content.getDefaultPlan('ar'));
  await repos.adwamuha.save({
    enabled,
    plan,
    state: startPlan(step, DAY),
    startedOn: DAY,
    offSince: null,
  });
  counterStore.resetMany([1901, 1012, 1013, 1005, 133901, 133012]);
  return repos;
}

describe('the Adwamuha ward in the reader', () => {
  it('is the opening and the dhikr of step 1, in the usual reader', async () => {
    const repos = await withPlan(1);
    setRouteParams({ session: 'morning' });
    await renderWithApp(<WardScreen />, repos, { now: at(7) });
    expect(await screen.findByText('ورد الصباح')).toBeOnTheScreen();
    expect(screen.getByText('1 من 2')).toBeOnTheScreen();
  });

  it('grows with the step: step 3 has the opening and three adhkar', async () => {
    const repos = await withPlan(3);
    setRouteParams({ session: 'evening' });
    await renderWithApp(<WardScreen />, repos, { now: at(18) });
    expect(await screen.findByText('1 من 4')).toBeOnTheScreen();
    expect(screen.getByText('ورد المساء')).toBeOnTheScreen();
  });

  it('records the day when finished in its window (on time), then shows the prayer', async () => {
    const repos = await withPlan(1);
    setRouteParams({ session: 'morning' });
    await renderWithApp(<WardScreen />, repos, { now: at(7) });
    await screen.findByText('1 من 2');
    await fireEvent.press(completeButton());
    await waitFor(() => expect(screen.getByText('2 من 2')).toBeOnTheScreen(), { timeout: 2000 });
    await fireEvent.press(completeButton());
    await waitFor(
      () =>
        expect(mockRouter.replace).toHaveBeenCalledWith({
          pathname: '/adwamuha/ward/[session]/done',
          params: { session: 'morning', counted: '1' },
        }),
      { timeout: 2000 },
    );
    expect(await repos.adwamuha.listRecords()).toEqual([
      {
        date: DAY,
        session: 'morning',
        completedAt: at(7)().getTime(),
        late: false,
        source: 'reader',
        step: 1,
      },
    ]);
  });

  it('does not count a morning ward finished after the evening began', async () => {
    const repos = await withPlan(1);
    setRouteParams({ session: 'morning' });
    const clock = { now: at(15, 58) };
    await renderWithApp(<WardScreen />, repos, { now: () => clock.now() });
    await screen.findByText('1 من 2');
    await fireEvent.press(completeButton());
    await waitFor(() => expect(screen.getByText('2 من 2')).toBeOnTheScreen(), { timeout: 2000 });
    clock.now = at(16, 1); // opened in its window: it stays open, but no longer counts
    await fireEvent.press(completeButton());
    await waitFor(
      () =>
        expect(mockRouter.replace).toHaveBeenCalledWith({
          pathname: '/adwamuha/ward/[session]/done',
          params: { session: 'morning', counted: '0' },
        }),
      { timeout: 2000 },
    );
    expect(await repos.adwamuha.listRecords()).toEqual([]);
  });

  it.each([
    ['plan', 'تم 0 من 3'], // step 1's dhikr (said 3 times) comes second
    ['category', 'تم 0 من 1'], // step 3's dhikr comes before it in the book (said once)
  ] as const)('«ترتيب الورد»: %s order', async (wardOrder, second) => {
    const repos = await withPlan(3);
    await repos.settings.set('wardOrder', wardOrder);
    setRouteParams({ session: 'morning' });
    await renderWithApp(<WardScreen />, repos, { now: at(7) });
    await screen.findByText('1 من 4');
    await fireEvent.press(completeButton()); // the opening, always first
    await waitFor(() => expect(screen.getByText('2 من 4')).toBeOnTheScreen(), { timeout: 2000 });
    expect(screen.getByLabelText(/^تم \d+ من \d+$/).props.accessibilityLabel).toBe(second);
  });

  it('read in parts (owner, 2026-11-14): kept for its window, gone the next day or once finished', async () => {
    const repos = await withPlan(3);
    setRouteParams({ session: 'morning' });
    const first = await renderWithApp(<WardScreen />, repos, { now: at(7) });
    await screen.findByText('1 من 4');
    await fireEvent.press(completeButton()); // the opening
    await waitFor(() => expect(screen.getByText('2 من 4')).toBeOnTheScreen(), { timeout: 2000 });
    await waitFor(async () =>
      expect(Object.keys(await repos.adwamuha.loadWardProgress('morning', DAY))).toEqual(['1901']),
    );
    await first.unmount();
    expect(counterStore.get(1901)).toBe(0); // leaving still resets the reader itself

    // Back later the same morning: it goes on at the first dhikr not read.
    const again = await renderWithApp(<WardScreen />, repos, { now: at(11) });
    expect(await screen.findByText('2 من 4')).toBeOnTheScreen();
    await again.unmount();

    // The next day's ward starts from the beginning.
    const tomorrow = await renderWithApp(<WardScreen />, repos, {
      now: () => new Date(2026, 0, 16, 7, 0),
    });
    expect(await screen.findByText('1 من 4')).toBeOnTheScreen();
    await tomorrow.unmount();

    // Finished: nothing kept any more.
    await renderWithApp(<WardScreen />, repos, { now: at(11) });
    await screen.findByText('2 من 4');
    for (const position of [3, 4]) {
      await fireEvent.press(completeButton());
      await waitFor(() => expect(screen.getByText(`${position} من 4`)).toBeOnTheScreen(), {
        timeout: 2000,
      });
    }
    await fireEvent.press(completeButton());
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled(), { timeout: 2000 });
    await waitFor(async () =>
      expect(await repos.adwamuha.loadWardProgress('morning', DAY)).toEqual({}),
    );
  });

  it.each([
    ['morning', 17, 'انتهى وقت ورد الصباح.'],
    ['evening', 9, 'انتهى وقت ورد المساء.'],
  ] as const)(
    'outside its window the %s ward does not open: back to Home with a note (owner, 2026-11-21)',
    async (session, hh, note) => {
      const repos = await withPlan(1);
      setRouteParams({ session });
      await renderWithApp(<WardScreen />, repos, { now: at(hh) });
      expect(await screen.findByText(note)).toBeOnTheScreen();
      expect(mockRouter.dismissTo).toHaveBeenCalledWith('/');
      expect(screen.queryByText('1 من 2')).toBeNull();
    },
  );

  it('has no «read the rest» mode: an old link still opens the ward only', async () => {
    const repos = await withPlan(1);
    setRouteParams({ session: 'morning', rest: '1' });
    await renderWithApp(<WardScreen />, repos, { now: at(7) });
    expect(await screen.findByText('ورد الصباح')).toBeOnTheScreen();
    expect(screen.getByText('1 من 2')).toBeOnTheScreen();
  });

  it('says so when the feature is off', async () => {
    const repos = await withPlan(1, false);
    setRouteParams({ session: 'morning' });
    await renderWithApp(<WardScreen />, repos, { now: at(7) });
    expect(await screen.findByText('«أدومها» غير مفعّلة.')).toBeOnTheScreen();
  });
});

describe('the whole morning / evening category', () => {
  function FinishCategory({ id }: { id: number }) {
    const { onCategoryFinished, records } = useAdwamuha();
    return <Text onPress={() => void onCategoryFinished(id)}>{`finish ${records.length}`}</Text>;
  }

  it('other categories do not count', async () => {
    const repos = await withPlan(1);
    await renderWithApp(<FinishCategory id={4} />, repos, { now: at(18) });
    await fireEvent.press(await screen.findByText('finish 0'));
    expect(await repos.adwamuha.listRecords()).toEqual([]);
  });

  it('records the evening when the evening category is finished', async () => {
    const repos = await withPlan(1);
    await renderWithApp(<FinishCategory id={133} />, repos, { now: at(18) });
    await fireEvent.press(await screen.findByText('finish 0'));
    expect(await screen.findByText('finish 1')).toBeOnTheScreen();
    expect((await repos.adwamuha.listRecords())[0]).toMatchObject({
      date: DAY,
      session: 'evening',
      late: false,
    });
  });
});

describe('after a ward', () => {
  it("shows the owner's prayer and asks to stop at the ward, with no «read the rest»", async () => {
    const repos = await withPlan(1);
    await repos.adwamuha.addRecord({
      date: DAY,
      session: 'morning',
      completedAt: 1,
      late: false,
      source: 'reader',
      step: 1,
    });
    setRouteParams({ session: 'morning', counted: '1' });
    const first = await renderWithApp(<WardDoneScreen />, repos, { now: at(7) });
    // The owner's prayer or a library message, kept for this ward of this day.
    const snippet = await shownFor(repos, `ward:${DAY}:morning`);
    expect(await screen.findByText(snippet, { exact: false })).toBeOnTheScreen();
    await first.unmount();
    await renderWithApp(<WardDoneScreen />, repos, { now: at(8) });
    expect(await screen.findByText(snippet, { exact: false })).toBeOnTheScreen();
    expect(await repos.adwamuha.listPicks('wardDone')).toHaveLength(1);
    expect(screen.getByText(/^اكتفِ اليوم بوردك/)).toBeOnTheScreen();
    expect(screen.queryByText(/باقي/)).toBeNull();
    expect(screen.getByText('العودة إلى الرئيسية')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('العودة إلى الرئيسية'));
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/');
  });

  it("the day's second ward: the same as the first, not the owner's prayer (owner, 2026-11-01)", async () => {
    const repos = await withPlan(1);
    for (const session of ['morning', 'evening'] as const) {
      await repos.adwamuha.addRecord({
        date: DAY,
        session,
        completedAt: 1,
        late: false,
        source: 'reader',
        step: 1,
      });
    }
    setRouteParams({ session: 'evening', counted: '1' });
    await renderWithApp(<WardDoneScreen />, repos, { now: at(18) });
    const snippet = await shownFor(repos, `ward:${DAY}:evening`);
    expect(await screen.findByText(snippet, { exact: false })).toBeOnTheScreen();
    expect(screen.getByText(/^اكتفِ الليلة بوردك/)).toBeOnTheScreen();
    // The prayer for both wards is Home's only.
    const texts = await repos.content.listAdwamuhaTexts('ar');
    const prayer = texts.find((t) => t.id === 'owner:bothDone')!.text;
    expect(screen.queryByText(prayer)).toBeNull();
    expect(screen.getByText('العودة إلى الرئيسية')).toBeOnTheScreen();
  });

  it('says plainly when the ward did not count', async () => {
    const repos = await withPlan(1);
    setRouteParams({ session: 'morning', counted: '0' });
    await renderWithApp(<WardDoneScreen />, repos, { now: at(17) });
    expect(
      await screen.findByText('أتممتَ الورد، لكنه لا يُحسب لليوم لأن وقته ليس الآن.'),
    ).toBeOnTheScreen();
    expect(await repos.adwamuha.listPicks('wardDone')).toEqual([]); // no message used up
  });

  it('no message comes again until every one was shown (owner, 2026-11-21)', async () => {
    const s = await startScenario({ day: DAY, hour: 7 });
    const size = (await momentSnippets(s.repos, 'wardDone')).length;
    expect(size).toBeGreaterThan(10); // the owner's words and the approved verses and hadiths
    const choose = (n: number) =>
      s.run((app) => app.chooseMessage('wardDone', `ward:${addDays(DAY, n)}:morning`));
    const shown: string[] = [];
    for (let n = 0; n < size; n++) shown.push(snippetOf((await choose(n))!));
    const picks = async () => s.repos.adwamuha.listPicks('wardDone'); // the latest first
    expect(new Set((await picks()).map((p) => p.messageId)).size).toBe(size);
    // A ward keeps its message.
    expect(snippetOf((await choose(3))!)).toBe(shown[3]);
    expect(await picks()).toHaveLength(size);
    // Then a new round, not starting with the message just shown.
    await choose(size);
    const [next, last] = await picks();
    expect(next).toMatchObject({ round: 2 });
    expect(next!.messageId).not.toBe(last!.messageId);
  }, 30_000);
});

/** The message saved for a ward (`occasion`), as it shows on screen. */
async function shownFor(repos: Repositories, occasion: string): Promise<string> {
  let id = '';
  await waitFor(async () => {
    const pick = (await repos.adwamuha.listPicks('wardDone')).find((p) => p.occasion === occasion);
    expect(pick).toBeDefined();
    id = pick!.messageId;
  });
  const texts = await repos.content.listAdwamuhaTexts('ar');
  const library = await repos.content.listAdwamuhaMessages('ar');
  return snippetOf(messagePool('wardDone', texts, library).find((m) => m.key === id)!.content);
}
