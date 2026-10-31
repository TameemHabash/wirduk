import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { MIN_MATCH_SCORE, matchScore, parseAppendix } from './plan-match';

const prompt = readFileSync(
  join(__dirname, '..', '..', 'docs', 'adwamuha', 'feature-prompt.md'),
  'utf8',
);

describe("reading the owner's prompt", () => {
  const plan = parseAppendix(prompt);

  it('finds the opening, 4 stages and 24 steps', () => {
    expect(plan.opening.length).toBeGreaterThan(10);
    expect(plan.stages.map((s) => [s.stage, s.weeks])).toEqual([
      [1, 4],
      [2, 3],
      [3, 2],
      [4, 4],
    ]);
    expect(plan.stages.every((s) => s.title.length > 0)).toBe(true);
    expect(plan.steps.map((s) => s.step)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
  });

  it('reads each step: stage, sessions, count hint and the evening wording', () => {
    const step = (n: number) => plan.steps.find((s) => s.step === n)!;
    expect(step(1)).toMatchObject({ stage: 1, sessions: ['M', 'E'], countHint: 3, variant: null });
    expect(step(7)).toMatchObject({ stage: 2, sessions: ['E'], countHint: 3 });
    expect(step(8).variant).not.toBeNull(); // أمسينا… for the evening
    expect(step(20)).toMatchObject({ stage: 3, sessions: ['M'] });
    expect(step(24)).toMatchObject({ stage: 4, sessions: ['M'], countHint: 100 });
  });

  it('refuses a file without an appendix', () => {
    expect(() => parseAppendix('# Something else')).toThrow(/appendix/);
  });
});

describe('matchScore', () => {
  const plan = parseAppendix(prompt);
  const step19 = plan.steps.find((s) => s.step === 19)!;

  it('scores the same words higher with the right count (the ×10 and ×100 adhkar)', () => {
    // The key's own words, as a stand-in for the dhikr text.
    const as = (count: number) => ({ id: 1, count, text: step19.key });
    expect(matchScore(step19.key, 10, as(10))).toBeGreaterThan(matchScore(step19.key, 10, as(100)));
    expect(matchScore(step19.key, 10, as(10))).toBeGreaterThanOrEqual(MIN_MATCH_SCORE);
  });

  it('does not match unrelated words', () => {
    expect(matchScore(step19.key, 10, { id: 1, count: 10, text: 'abc def' })).toBeLessThan(
      MIN_MATCH_SCORE,
    );
  });
});
