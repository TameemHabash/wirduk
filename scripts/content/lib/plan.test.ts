import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type PlanFile, validatePlan } from './plan';
import type { ContentDhikr } from './types';

// Words only (no Arabic needed): the check compares keys and texts the same way.
const dhikr = (id: number, categoryId: number, text: string, count = 1): ContentDhikr => ({
  id,
  categoryId,
  sortOrder: id % 1000,
  count,
  audioFile: null,
  texts: { ar: text },
});

const adhkar = [
  dhikr(1901, 1, 'opening words here'),
  dhikr(1001, 1, 'alpha beta gamma', 3),
  dhikr(1002, 1, 'delta epsilon zeta'),
  dhikr(133901, 133, 'opening words here'),
  dhikr(133001, 133, 'alpha beta gamma', 3),
];

const goodPlan = (): PlanFile => ({
  about: 'test',
  ownerChanges: [],
  opening: { M: 1901, E: 133901, key: 'opening words here' },
  stages: [{ stage: 1, weeks: 4, title: { ar: 'one' } }],
  steps: [
    { step: 1, stage: 1, M: 1001, E: 133001, key: 'alpha beta gamma', keyE: null, countHint: 3 },
    { step: 2, stage: 1, M: 1002, E: null, key: 'delta epsilon zeta', keyE: null, countHint: 1 },
  ],
});

describe('validatePlan', () => {
  it('turns a good plan into rows, the opening as step 0', () => {
    expect(validatePlan(goodPlan(), adhkar, 'ar')).toEqual({
      stages: [{ stage: 1, weeks: 4, titles: { ar: 'one' } }],
      steps: [
        { step: 0, stage: null, morningDhikrId: 1901, eveningDhikrId: 133901 },
        { step: 1, stage: 1, morningDhikrId: 1001, eveningDhikrId: 133001 },
        { step: 2, stage: 1, morningDhikrId: 1002, eveningDhikrId: null },
      ],
    });
  });

  const fails = (change: (p: PlanFile) => void, message: RegExp) => {
    const plan = goodPlan();
    change(plan);
    expect(() => validatePlan(plan, adhkar, 'ar')).toThrow(message);
  };

  it('fails when a morning or evening dhikr is missing from the plan', () => {
    fails((p) => (p.steps[1]!.M = null), /Step 2 adds no dhikr/);
    fails((p) => p.steps.pop(), /Dhikr 1002 is not in the plan/);
  });

  it('fails when a dhikr is used twice', () => {
    fails((p) => (p.steps[1]!.M = 1001), /Dhikr 1001 is in the plan twice/);
  });

  it('fails when an id is missing or in the wrong session', () => {
    fails((p) => (p.steps[0]!.M = 1999), /no dhikr 1999/);
    fails((p) => (p.steps[0]!.E = 1001), /dhikr 1001 is not in the evening/);
  });

  it('fails when an id no longer matches its key (the content changed)', () => {
    fails((p) => (p.steps[0]!.key = 'something else entirely'), /no longer matches its key/);
  });

  it('fails on gaps in the numbering and on bad weeks', () => {
    fails((p) => (p.steps[1]!.step = 3), /Step 3 should be number 2/);
    fails((p) => (p.stages[0]!.weeks = 9), /weeks must be 1–8/);
    fails((p) => (p.stages[0]!.title = {}), /no "ar" title/);
  });
});

describe('the real plan file', () => {
  it('is the 24 steps the owner approved, step 23 in the morning and the evening', () => {
    const file = JSON.parse(
      readFileSync(
        join(__dirname, '..', '..', '..', 'content-source', 'adwamuha-plan.json'),
        'utf8',
      ),
    ) as PlanFile;
    expect(file.steps).toHaveLength(24);
    expect(file.opening).toMatchObject({ M: 1901, E: 133901 });
    expect(file.steps[22]).toMatchObject({ step: 23, M: 1022, E: 133022 });
    expect(file.steps[23]).toMatchObject({ step: 24, M: 1019, E: null });
    expect(file.steps[6]).toMatchObject({ step: 7, M: null, E: 133023 });
  });
});
