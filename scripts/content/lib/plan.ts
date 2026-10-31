/**
 * Adwamuha's default plan in the content build. Read from
 * `content-source/adwamuha-plan.json` (written by
 * `scripts/adwamuha/match-plan.ts --write`), checked on every build, written
 * to the Plan* tables. Users get their own copy in user.db when they turn the
 * feature on (owner, 2026-10-23), so this is only the default.
 */
import { APP_CONFIG } from '../../../src/config/app-config.ts';
import { MIN_MATCH_SCORE, matchScore } from '../../adwamuha/plan-match.ts';

import type { ContentDhikr } from './types.ts';

/** Shape of `content-source/adwamuha-plan.json`. */
export interface PlanFile {
  about: string;
  ownerChanges: string[];
  opening: { M: number; E: number; key: string };
  stages: { stage: number; weeks: number; title: Record<string, string> }[];
  steps: {
    step: number;
    stage: number;
    /** The morning / evening dhikr this step adds, or null when the step is for one session. */
    M: number | null;
    E: number | null;
    /** The owner's matching keys (never shown): checked again on every build. */
    key: string;
    keyE: string | null;
    countHint: number;
  }[];
}

/** The checked plan, as written to the content database. */
export interface ContentPlan {
  stages: { stage: number; weeks: number; titles: Record<string, string> }[];
  /** Step 0 is the opening: first in every ward, not a step of its own (stage null). */
  steps: {
    step: number;
    stage: number | null;
    morningDhikrId: number | null;
    eveningDhikrId: number | null;
  }[];
}

/**
 * Checks the plan against the content and fails the build (listing every
 * problem) when: numbering has gaps, a step adds nothing, an id is missing or
 * in the wrong category, an id no longer matches its key (the content
 * changed), or a morning / evening dhikr is missing from the plan or used twice.
 */
export function validatePlan(
  file: PlanFile,
  adhkar: readonly ContentDhikr[],
  lang: string,
): ContentPlan {
  const problems: string[] = [];
  const category = {
    M: APP_CONFIG.content.morningCategoryId,
    E: APP_CONFIG.content.eveningCategoryId,
  } as const;
  const byId = new Map(adhkar.map((a) => [a.id, a]));

  file.stages.forEach((s, i) => {
    if (s.stage !== i + 1) problems.push(`Stage ${s.stage} should be number ${i + 1}`);
    if (!Number.isInteger(s.weeks) || s.weeks < 1 || s.weeks > 8) {
      problems.push(`Stage ${s.stage}: weeks must be 1–8, got ${s.weeks}`);
    }
    if (!s.title[lang]?.trim()) problems.push(`Stage ${s.stage} has no "${lang}" title`);
  });
  let lastStage = 1;
  file.steps.forEach((s, i) => {
    if (s.step !== i + 1) problems.push(`Step ${s.step} should be number ${i + 1}`);
    if (!file.stages.some((st) => st.stage === s.stage)) {
      problems.push(`Step ${s.step}: no stage ${s.stage}`);
    }
    if (s.stage < lastStage)
      problems.push(`Step ${s.step}: stage ${s.stage} after stage ${lastStage}`);
    lastStage = Math.max(lastStage, s.stage);
    if (s.M === null && s.E === null) problems.push(`Step ${s.step} adds no dhikr`);
  });

  const check = (where: string, session: 'M' | 'E', id: number, keys: string[], hint: number) => {
    const dhikr = byId.get(id);
    if (!dhikr) {
      problems.push(`${where}: no dhikr ${id}`);
      return;
    }
    if (dhikr.categoryId !== category[session]) {
      problems.push(
        `${where}: dhikr ${id} is not in the ${session === 'M' ? 'morning' : 'evening'}`,
      );
      return;
    }
    const text = dhikr.texts[lang] ?? '';
    const score = Math.max(
      ...keys.map((k) => matchScore(k, hint, { id, count: dhikr.count, text })),
    );
    if (score < MIN_MATCH_SCORE) {
      problems.push(`${where}: dhikr ${id} no longer matches its key (score ${score.toFixed(2)})`);
    }
  };
  check('Opening (morning)', 'M', file.opening.M, [file.opening.key], 1);
  check('Opening (evening)', 'E', file.opening.E, [file.opening.key], 1);
  for (const s of file.steps) {
    if (s.M !== null) check(`Step ${s.step} (morning)`, 'M', s.M, [s.key], s.countHint);
    const eveningKeys = s.keyE ? [s.key, s.keyE] : [s.key];
    if (s.E !== null) check(`Step ${s.step} (evening)`, 'E', s.E, eveningKeys, s.countHint);
  }

  // Every morning and evening dhikr exactly once (the opening included).
  for (const session of ['M', 'E'] as const) {
    const planned = [file.opening[session], ...file.steps.map((s) => s[session])].filter(
      (id): id is number => id !== null,
    );
    const seen = new Set<number>();
    for (const id of planned) {
      if (seen.has(id)) problems.push(`Dhikr ${id} is in the plan twice`);
      seen.add(id);
    }
    for (const a of adhkar.filter((d) => d.categoryId === category[session])) {
      if (!seen.has(a.id)) problems.push(`Dhikr ${a.id} is not in the plan`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Adwamuha plan check failed:\n- ${problems.join('\n- ')}`);
  }
  return {
    stages: file.stages.map((s) => ({ stage: s.stage, weeks: s.weeks, titles: s.title })),
    steps: [
      { step: 0, stage: null, morningDhikrId: file.opening.M, eveningDhikrId: file.opening.E },
      ...file.steps.map((s) => ({
        step: s.step,
        stage: s.stage,
        morningDhikrId: s.M,
        eveningDhikrId: s.E,
      })),
    ],
  };
}
