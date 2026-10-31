/**
 * Adwamuha (milestone 10): finds each item of the owner's default plan in the
 * content database and reports what matched (`docs/adwamuha/matching.md`).
 * With --write it also writes the plan file the content build reads
 * (`content-source/adwamuha-plan.json`): ids, stages, and the owner's keys and
 * stage names, cut from the owner's prompt (never retyped).
 *
 *   node scripts/adwamuha/match-plan.ts [--out <file.md>] [--write]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { APP_CONFIG } from '../../src/config/app-config.ts';
import type { PlanFile } from '../content/lib/plan.ts';

import {
  type Candidate,
  MIN_MATCH_SCORE,
  type Session,
  matchScore,
  parseAppendix,
} from './plan-match.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const PROMPT = join(ROOT, 'docs', 'adwamuha', 'feature-prompt.md');
const DB = join(ROOT, 'assets', 'db', 'content.db');
const PLAN_FILE = join(ROOT, 'content-source', 'adwamuha-plan.json');
const CATEGORY: Record<Session, number> = {
  M: APP_CONFIG.content.morningCategoryId,
  E: APP_CONFIG.content.eveningCategoryId,
};

/** The owner's changes to the prompt's plan (given in chat; docs/decisions.md → Adwamuha). */
const OWNER_CHANGES: { step: number; sessions: Session[]; note: string }[] = [
  {
    step: 23,
    sessions: ['M', 'E'],
    note: 'Step 23 is morning and evening, not morning only (owner, 2026-10-23).',
  },
];

function loadCandidates(db: DatabaseSync, categoryId: number): Candidate[] {
  return db
    .prepare(
      `SELECT a.Id AS id, a.Count AS count, t.Text AS text
         FROM Adhkar a JOIN DhikrTranslations t ON t.DhikrId = a.Id AND t.Lang = 'ar'
        WHERE a.CategoryId = ? ORDER BY a.SortOrder`,
    )
    .all(categoryId) as unknown as Candidate[];
}

function main() {
  const outArg = process.argv.indexOf('--out');
  const out = outArg > 0 ? process.argv[outArg + 1] : undefined;
  const write = process.argv.includes('--write');

  const prompt = parseAppendix(readFileSync(PROMPT, 'utf8'));
  const steps = prompt.steps.map((s) => {
    const change = OWNER_CHANGES.find((c) => c.step === s.step);
    return change ? { ...s, sessions: change.sessions } : s;
  });
  const db = new DatabaseSync(DB, { readOnly: true });
  const items: Record<Session, Candidate[]> = {
    M: loadCandidates(db, CATEGORY.M),
    E: loadCandidates(db, CATEGORY.E),
  };
  db.close();

  // Every (step, session) to find; step 0 is the opening.
  const wanted: { step: number; session: Session; keys: string[]; hint: number }[] = [];
  for (const s of ['M', 'E'] as const) {
    wanted.push({ step: 0, session: s, keys: [prompt.opening], hint: 1 });
  }
  for (const p of steps) {
    for (const s of p.sessions) {
      const keys = s === 'E' && p.variant ? [p.key, p.variant] : [p.key];
      wanted.push({ step: p.step, session: s, keys, hint: p.countHint });
    }
  }

  // Best pairs first; each dhikr used once.
  const pairs = wanted.flatMap((w, wi) =>
    items[w.session].map((c) => ({
      wi,
      c,
      score: Math.max(...w.keys.map((k) => matchScore(k, w.hint, c))),
    })),
  );
  pairs.sort((a, b) => b.score - a.score);
  const chosen = new Map<number, { c: Candidate; score: number }>();
  const used = new Set<number>();
  for (const p of pairs) {
    if (p.score < MIN_MATCH_SCORE || chosen.has(p.wi) || used.has(p.c.id)) continue;
    chosen.set(p.wi, { c: p.c, score: p.score });
    used.add(p.c.id);
  }
  const idOf = (step: number, session: Session) => {
    const wi = wanted.findIndex((w) => w.step === step && w.session === session);
    return wi < 0 ? null : (chosen.get(wi)?.c.id ?? null);
  };

  // The report.
  const firstWords = (text: string) => {
    const w = text.replace(/\s+/g, ' ').trim().split(' ');
    return w.slice(0, 7).join(' ') + (w.length > 7 ? ' …' : '');
  };
  const stepOf = (n: number) => steps.find((p) => p.step === n);
  const lines = [
    '| Step | Stage | Session | DB id | First words (DB) | DB count | Prompt count | Score |',
    '|---|---|---|---|---|---|---|---|',
  ];
  const rows = wanted
    .map((w, wi) => ({ w, m: chosen.get(wi) }))
    .sort((a, b) => a.w.step - b.w.step || (a.w.session === 'M' ? -1 : 1));
  for (const { w, m } of rows) {
    const label = w.step === 0 ? 'opening' : String(w.step);
    const stage = w.step === 0 ? '—' : String(stepOf(w.step)!.stage);
    if (!m) {
      lines.push(`| ${label} | ${stage} | ${w.session} | **not found** | | | ${w.hint} | |`);
      continue;
    }
    const warn = m.c.count === w.hint ? '' : ' ⚠';
    lines.push(
      `| ${label} | ${stage} | ${w.session} | ${m.c.id} | ${firstWords(m.c.text)} | ` +
        `${m.c.count}${warn} | ${w.hint} | ${m.score.toFixed(2)} |`,
    );
  }
  const unused = (['M', 'E'] as const).flatMap((s) =>
    items[s].filter((c) => !used.has(c.id)).map((c) => ({ s, c })),
  );
  lines.push(
    '',
    `Morning adhkar in the DB: ${items.M.length}. Evening: ${items.E.length}.`,
    `Plan items: morning ${wanted.filter((w) => w.session === 'M').length}, ` +
      `evening ${wanted.filter((w) => w.session === 'E').length} (the opening included).`,
    `Owner's changes: ${OWNER_CHANGES.map((c) => c.note).join(' ')}`,
    '',
    'DB adhkar not in the plan:',
  );
  if (unused.length === 0) lines.push('- none');
  for (const { s, c } of unused)
    lines.push(`- ${s} ${c.id} (count ${c.count}): ${firstWords(c.text)}`);
  const report = lines.join('\n');
  if (out) writeFileSync(out, `${report}\n`);
  console.log(report);

  if (!write) return;
  const missing = rows.filter((r) => !r.m);
  if (missing.length > 0 || unused.length > 0) {
    throw new Error(
      'Not writing the plan: some items are not matched, or some adhkar are left out.',
    );
  }
  const plan: PlanFile = {
    about:
      'The default Adwamuha plan. Written by scripts/adwamuha/match-plan.ts --write: ids found ' +
      'in the content, keys and stage titles cut from docs/adwamuha/feature-prompt.md. Do not ' +
      'edit the Arabic by hand.',
    ownerChanges: OWNER_CHANGES.map((c) => c.note),
    opening: { M: idOf(0, 'M')!, E: idOf(0, 'E')!, key: prompt.opening },
    stages: prompt.stages.map((s) => ({ stage: s.stage, weeks: s.weeks, title: { ar: s.title } })),
    steps: steps.map((p) => ({
      step: p.step,
      stage: p.stage,
      M: p.sessions.includes('M') ? idOf(p.step, 'M') : null,
      E: p.sessions.includes('E') ? idOf(p.step, 'E') : null,
      key: p.key,
      keyE: p.variant,
      countHint: p.countHint,
    })),
  };
  writeFileSync(PLAN_FILE, `${JSON.stringify(plan, null, 2)}\n`);
  console.log(`\nWrote ${PLAN_FILE}`);
}

if (process.argv[1]?.endsWith('match-plan.ts')) main();
