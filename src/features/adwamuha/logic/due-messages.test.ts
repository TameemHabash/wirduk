import type { AdwamuhaMessage, AdwamuhaText, PlanState } from '@/data/models';
import type { AdwamuhaEvent } from '@/data/repositories/adwamuha-repository';
import { daily, day, planOf, stateAt } from '@/test-utils/adwamuha';

import { type DueMessagesInput, dueMessages, weekMessageKey } from './due-messages';

const text = (moment: AdwamuhaText['moment'], state: string, words: string): AdwamuhaText => ({
  id: `${moment}:${state}`,
  moment,
  state,
  text: words,
});
const texts = [
  text('newStep', '', 'new step'),
  text('afterStepBack', '', 'back'),
  text('weekReached', '', 'week reached'),
  text('weekBelow', '', 'week below'),
  text('finished', '', 'the end'),
  text('tip', 'stage:1', 'tip 1'),
  text('tip', 'maintenance', 'keep it'),
  text('welcome', 'first:evening', 'welcome, evening'),
  text('welcome', 'later:morning', 'welcome, later'),
];
const library: AdwamuhaMessage[] = [];

let nextId = 1;
const event = (kind: string, onDay: number, step = 1): AdwamuhaEvent => ({
  id: nextId++,
  at: 0,
  day: day(onDay),
  kind,
  step,
  data: null,
});

/** Day 2 (2026-01-03) is a Saturday: weeks start on it (the default). */
function input(extra: Partial<DueMessagesInput> & { state?: PlanState } = {}): DueMessagesInput {
  const { state = stateAt(1, day(2)), ...rest } = extra;
  return {
    stored: { enabled: true, plan: planOf(1, 1, 1), state, startedOn: day(2), offSince: null },
    events: [],
    shown: new Set(['tip:1']),
    picks: [],
    records: [],
    pauses: [],
    today: day(3),
    weekStart: 6,
    texts,
    library,
    textsRead: true,
    ...rest,
  };
}
const kinds = (i: DueMessagesInput) => dueMessages(i).map((m) => m.kind);
const words = (i: DueMessagesInput) =>
  dueMessages(i).map((m) => (m.content.kind === 'owner' ? m.content.text : m.content.message.id));

describe("Home's one-time messages", () => {
  it('nothing when everything was shown', () => {
    expect(dueMessages(input())).toEqual([]);
  });

  it('the welcome after turning it on: for the starting step and the ward open then', () => {
    const start = event('start', 3);
    const evening = stateAt(1, day(2), { planStartedIn: 'evening' });
    expect(words(input({ events: [start], state: evening }))).toEqual(['welcome, evening']);
    const later = event('start', 3, 5);
    expect(words(input({ events: [later] }))).toEqual(['welcome, later']);
    // Two days later it is old news.
    expect(dueMessages(input({ events: [start], today: day(5) }))).toEqual([]);
  });

  it("a stage's tip once, and the maintenance tip after the last step", () => {
    expect(words(input({ shown: new Set() }))).toEqual(['tip 1']);
    const done = stateAt(3, day(2), { maintenance: true });
    expect(words(input({ state: done }))).toEqual(['keep it']);
    expect(dueMessages(input({ state: done, shown: new Set(['tip:maintenance']) }))).toEqual([]);
  });

  it('a new step, a step back or a break: a word today or yesterday, not later', () => {
    expect(kinds(input({ events: [event('advance', 3)] }))).toEqual(['newStep']);
    expect(kinds(input({ events: [event('advance', 2)] }))).toEqual(['newStep']);
    expect(dueMessages(input({ events: [event('advance', 1)] }))).toEqual([]);
    expect(kinds(input({ events: [event('break', 3)] }))).toEqual(['afterStepBack']);
  });

  it('several new steps the same day: one message that marks them all', () => {
    const [a, b] = [event('advance', 3), event('advance', 3)];
    const due = dueMessages(input({ events: [a, b] }));
    expect(due).toHaveLength(1);
    expect(due[0]!.keys).toEqual([`event:${a.id}`, `event:${b.id}`]);
    expect(due[0]!.pick).toMatchObject({ moment: 'newStep', occasion: `event:${a.id}` });
  });

  it('the end of a week: reached or below, once per step and week', () => {
    const full = { records: daily(2, 8), today: day(9) };
    expect(words(input(full))).toEqual(['week reached']);
    expect(words(input({ records: daily(2, 4), today: day(9) }))).toEqual(['week below']);
    const key = weekMessageKey(stateAt(1, day(2)), day(2));
    expect(dueMessages(input({ ...full, shown: new Set(['tip:1', key]) }))).toEqual([]);
  });

  it('the end of the path comes first', () => {
    const due = input({
      events: [event('start', 3), event('finish', 3)],
      shown: new Set(),
      state: stateAt(1, day(2), { planStartedIn: 'evening' }),
    });
    expect(kinds(due)).toEqual(['finished', 'welcome', 'tip']);
  });

  it("no message of a moment's pool before the texts are read", () => {
    const due = input({ events: [event('advance', 3)], shown: new Set(), textsRead: false });
    expect(kinds(due)).toEqual(['tip']);
  });
});
