import { Text } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { counterStore } from '@/features/counter/counter-store';
import { momentSnippets } from '@/test-utils/adwamuha-messages';
import { createTestRepositories, renderWithApp } from '@/test-utils/render-app';
import { mockRouter, setRouteParams } from '@/test-utils/router-mock';

import { useAdwamuha } from './AdwamuhaProvider';
import { messagePool, pickMessage } from './logic/messages';
import { startPlan } from './logic/progress';
import { copyDefaultPlan } from './logic/ward';
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

  it('does not count a morning ward finished in the evening', async () => {
    const repos = await withPlan(1);
    setRouteParams({ session: 'morning' });
    await renderWithApp(<WardScreen />, repos, { now: at(17) });
    await screen.findByText('1 من 2');
    await fireEvent.press(completeButton());
    await waitFor(() => expect(screen.getByText('2 من 2')).toBeOnTheScreen(), { timeout: 2000 });
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
    await renderWithApp(<WardDoneScreen />, repos, { now: at(7) });
    // The owner's prayer or a library message, always the same for this ward of this day.
    const texts = await repos.content.listAdwamuhaTexts('ar');
    const library = await repos.content.listAdwamuhaMessages('ar');
    const picked = pickMessage(messagePool('wardDone', texts, library), `ward:${DAY}:morning`)!;
    const snippet = picked.kind === 'owner' ? picked.text : picked.message.texts[0]!;
    expect(await screen.findByText(snippet, { exact: false })).toBeOnTheScreen();
    expect(screen.getByText(/^اكتفِ اليوم بوردك/)).toBeOnTheScreen();
    expect(screen.queryByText(/باقي/)).toBeNull();
    expect(screen.getByText('العودة إلى الرئيسية')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('العودة إلى الرئيسية'));
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/');
  });

  it("both wards of the day done: only the owner's prayer (no verse or hadith, no other line)", async () => {
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
    const prayer = (await repos.content.listAdwamuhaTexts('ar')).find(
      (t) => t.id === 'owner:bothDone',
    )!.text;
    expect(await screen.findByText(prayer)).toBeOnTheScreen();
    expect(await momentSnippets(repos, 'bothDone')).toEqual([prayer]);
    expect(screen.queryByText(/^اكتفِ اليوم بوردك/)).toBeNull();
    expect(screen.getByText('العودة إلى الرئيسية')).toBeOnTheScreen();
  });

  it('says plainly when the ward did not count', async () => {
    const repos = await withPlan(1);
    setRouteParams({ session: 'morning', counted: '0' });
    await renderWithApp(<WardDoneScreen />, repos, { now: at(17) });
    expect(
      await screen.findByText('أتممتَ الورد، لكنه لا يُحسب لليوم لأن وقته ليس الآن.'),
    ).toBeOnTheScreen();
  });
});
