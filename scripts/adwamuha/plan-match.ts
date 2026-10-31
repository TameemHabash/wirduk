/**
 * Adwamuha (أدومها): reading the owner's default plan and finding its adhkar
 * in the content. Used by `match-plan.ts` (the report and the plan file) and
 * by the content build (which checks the plan file on every build).
 *
 * Arabic here is only what the owner's prompt gives (read at run time) and a
 * few matcher phrases: nothing is shown in the app from this file.
 */
import { toSearchText } from '../../src/text/normalize.ts';

export type Session = 'M' | 'E';

export interface PromptStage {
  stage: number;
  /** The stage's name, as the owner wrote it. */
  title: string;
  weeks: number;
}

export interface PromptStep {
  step: number;
  stage: number;
  sessions: Session[];
  /** The owner's matching key (never shown in the app). */
  key: string;
  /** The evening wording, when the prompt gives one. */
  variant: string | null;
  countHint: number;
}

/** Reads the appendix of the owner's prompt (`docs/adwamuha/feature-prompt.md`). */
export function parseAppendix(markdown: string): {
  opening: string;
  stages: PromptStage[];
  steps: PromptStep[];
} {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith('## Appendix'));
  if (start < 0) throw new Error('No appendix in the prompt');
  let opening = '';
  const stages: PromptStage[] = [];
  const steps: PromptStep[] = [];
  for (const line of lines.slice(start)) {
    const open = /^\*\*Opening[^*]*\*\*\s*(.+)$/.exec(line);
    if (open) opening = open[1]!.trim();
    const stage = /^### Stage (\d+): (.+?) \((\d+) weeks per step\)/.exec(line);
    if (stage) {
      stages.push({ stage: Number(stage[1]), title: stage[2]!.trim(), weeks: Number(stage[3]) });
    }
    const step = /^(\d+)\. \*\*(M\+E|M only|E only)\*\*: (.+?) \(×(\d+)\)(.*)$/.exec(line);
    if (step) {
      const sessions: Session[] =
        step[2] === 'M+E' ? ['M', 'E'] : step[2] === 'M only' ? ['M'] : ['E'];
      const variant = /The evening variant is (.+?)\.?\s*$/.exec(step[5]!)?.[1] ?? null;
      steps.push({
        step: Number(step[1]),
        stage: stages.at(-1)?.stage ?? 0,
        sessions,
        key: step[3]!.trim(),
        variant,
        countHint: Number(step[4]),
      });
    }
  }
  if (!opening) throw new Error('No opening in the appendix');
  return { opening, stages, steps };
}

/** A dhikr to compare with: its id, count and display text. */
export interface Candidate {
  id: number;
  count: number;
  text: string;
}

const words = (text: string) => toSearchText(text).split(' ').filter(Boolean);

/** The surahs step names them instead of quoting them: matched by the first words of each. */
const SURAH_STARTS = ['قل هو الله احد', 'قل اعوذ برب الفلق', 'قل اعوذ برب الناس'];

/**
 * 0..1: how much of the key is in the dhikr, how close the lengths are, and
 * whether the count is the prompt's hint (it tells apart the same words said
 * 10 and 100 times). Both sides are compared in the app's search form.
 */
export function matchScore(key: string, hint: number | null, candidate: Candidate): number {
  const have = words(candidate.text);
  if (key.includes('سورة الإخلاص')) {
    const text = have.join(' ');
    return SURAH_STARTS.every((s) => text.includes(s)) ? 1 : 0;
  }
  const kw = words(key);
  if (kw.length === 0 || have.length === 0) return 0;
  const set = new Set(have);
  const coverage = kw.filter((w) => set.has(w)).length / kw.length;
  const lengths = Math.min(kw.length, have.length) / Math.max(kw.length, have.length);
  const count = hint !== null && candidate.count === hint ? 0.1 : 0;
  return Math.min(1, coverage * 0.75 + lengths * 0.15 + count);
}

/** A match below this is "not found" (the report) or a build error (the plan check). */
export const MIN_MATCH_SCORE = 0.6;
