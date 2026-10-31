import type { DefaultPlan } from '@/data/models';

import type { UserPlan } from './types';
import { copyDefaultPlan, orderWard, wardDhikrIds } from './ward';

const plan: UserPlan = {
  opening: { morning: 1901, evening: 133901 },
  steps: [
    { stage: 1, weeks: 4, morningDhikrId: 1012, eveningDhikrId: 133012 },
    { stage: 1, weeks: 4, morningDhikrId: 1013, eveningDhikrId: 133013 },
    { stage: 2, weeks: 3, morningDhikrId: null, eveningDhikrId: 133023 }, // evening only
    { stage: 3, weeks: 2, morningDhikrId: 1020, eveningDhikrId: null }, // morning only
  ],
};

describe('the ward of a step', () => {
  it('is cumulative, the opening first, in plan order', () => {
    expect(wardDhikrIds(plan, 1, 'morning')).toEqual([1901, 1012]);
    expect(wardDhikrIds(plan, 2, 'evening')).toEqual([133901, 133012, 133013]);
  });

  it('an evening-only step changes only the evening ward', () => {
    expect(wardDhikrIds(plan, 3, 'morning')).toEqual([1901, 1012, 1013]);
    expect(wardDhikrIds(plan, 3, 'evening')).toEqual([133901, 133012, 133013, 133023]);
  });

  it('a morning-only step changes only the morning ward', () => {
    expect(wardDhikrIds(plan, 4, 'morning')).toEqual([1901, 1012, 1013, 1020]);
    expect(wardDhikrIds(plan, 4, 'evening')).toEqual([133901, 133012, 133013, 133023]);
  });

  it('never goes past the plan', () => {
    expect(wardDhikrIds(plan, 99, 'morning')).toEqual(wardDhikrIds(plan, 4, 'morning'));
  });
});

describe('«ترتيب الورد»', () => {
  // The morning category in the book's order (the opening is not first there).
  const category = [1001, 1901, 1012, 1013, 1020];
  const ward = [1901, 1020, 1012, 1013]; // plan order: the opening, then the steps

  it('plan order (the default) keeps the ward as it is', () => {
    expect(orderWard(ward, 'plan', category)).toEqual(ward);
  });

  it("category order: the same adhkar in the category's order, the opening still first", () => {
    expect(orderWard(ward, 'category', category)).toEqual([1901, 1012, 1013, 1020]);
    expect(orderWard(ward, 'category', category).sort()).toEqual([...ward].sort());
  });

  it('an id missing from the category stays, at the end; a short ward is unchanged', () => {
    expect(orderWard([1901, 9999, 1020, 1012], 'category', category)).toEqual([
      1901, 1012, 1020, 9999,
    ]);
    expect(orderWard([1901, 1012], 'category', category)).toEqual([1901, 1012]);
  });

  it('never changes the array it was given', () => {
    const given = [...ward];
    orderWard(given, 'category', category);
    expect(given).toEqual(ward);
  });
});

describe('copyDefaultPlan', () => {
  const defaultPlan: DefaultPlan = {
    stages: [
      { stage: 1, title: 'a', weeks: 4 },
      { stage: 2, title: 'b', weeks: 3 },
    ],
    steps: [
      { step: 2, stage: 2, morningDhikrId: 1013, eveningDhikrId: null },
      { step: 0, stage: null, morningDhikrId: 1901, eveningDhikrId: 133901 },
      { step: 1, stage: 1, morningDhikrId: 1012, eveningDhikrId: 133012 },
    ],
  };

  it("makes the user's copy: the opening, the steps in order, each with its stage's weeks", () => {
    expect(copyDefaultPlan(defaultPlan)).toEqual({
      opening: { morning: 1901, evening: 133901 },
      steps: [
        { stage: 1, weeks: 4, morningDhikrId: 1012, eveningDhikrId: 133012 },
        { stage: 2, weeks: 3, morningDhikrId: 1013, eveningDhikrId: null },
      ],
    });
  });

  it('refuses a default plan without the opening', () => {
    expect(() => copyDefaultPlan({ ...defaultPlan, steps: defaultPlan.steps.slice(0, 1) })).toThrow(
      /opening/,
    );
  });
});
