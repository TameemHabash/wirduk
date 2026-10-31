/**
 * Builds the shipped content database from content-source/.
 *
 *   npm run content:build    write assets/db/content.db, the lock file, docs/content-changes.md
 *                            and docs/sources-review.md
 *   npm run content:check    verify all three are up to date (used by `npm run verify`)
 *
 * Runs directly in Node 24 (built-in TypeScript type stripping and SQLite).
 */
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { APP_CONFIG } from '../../src/config/app-config.ts';
import { DEFAULT_LANGUAGE } from '../../src/i18n/languages.ts';

import { type MessageLibrary, shippedMessages } from '../adwamuha/messages.ts';

import { type PlanFile, validatePlan } from './lib/plan.ts';
import { type TextsFile, validateTexts } from './lib/texts.ts';
import { renderChangesReport } from './lib/report.ts';
import { renderSourcesReview } from './lib/sources-review.ts';
import { transformContent } from './lib/transform.ts';
import type {
  AudioManifest,
  ContentModel,
  DorarSources,
  Overrides,
  SourceCategory,
} from './lib/types.ts';
import { contentFingerprint, readContentVersion, writeContentDb } from './lib/write-db.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC_DIR = join(ROOT, 'content-source');
const DB_PATH = join(ROOT, 'assets', 'db', 'content.db');
const LOCK_PATH = join(SRC_DIR, 'content-lock.json');
const REPORT_PATH = join(ROOT, 'docs', 'content-changes.md');
const REVIEW_PATH = join(ROOT, 'docs', 'sources-review.md');
const PLAN_PATH = join(SRC_DIR, 'adwamuha-plan.json');
const MESSAGES_PATH = join(SRC_DIR, 'adwamuha-messages.json');
const TEXTS_PATH = join(SRC_DIR, 'adwamuha-texts.json');

interface SourceInfo {
  repo: string;
  commit: string;
}
interface Lock {
  version: number;
  fingerprint: string;
}

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

function loadModel(): { model: ContentModel; source: SourceInfo; dorar: DorarSources } {
  const source = readJson<SourceInfo>(join(SRC_DIR, 'source.json'));
  const dorar = readJson<DorarSources>(join(SRC_DIR, 'dorar-sources.json'));
  const model = transformContent(
    readJson<SourceCategory[]>(join(SRC_DIR, 'adhkar.json')),
    readJson<Overrides>(join(SRC_DIR, 'overrides.json')),
    readJson<AudioManifest>(join(SRC_DIR, 'audio-manifest.json')),
    dorar,
  );
  // Adwamuha's default plan: checked against the content on every build.
  if (existsSync(PLAN_PATH)) {
    model.plan = validatePlan(readJson<PlanFile>(PLAN_PATH), model.adhkar, DEFAULT_LANGUAGE);
  }
  // Adwamuha's messages: only the approved ones ship (the library is checked first).
  if (existsSync(MESSAGES_PATH)) {
    model.messages = shippedMessages(readJson<MessageLibrary>(MESSAGES_PATH), DEFAULT_LANGUAGE);
  }
  // Adwamuha's own messages and tips (scripts/adwamuha/owner-texts.ts), checked first.
  if (existsSync(TEXTS_PATH)) {
    model.texts = validateTexts(readJson<TextsFile>(TEXTS_PATH), DEFAULT_LANGUAGE);
  }
  return { model, source, dorar };
}

/** Builds the database at `path` and returns its content fingerprint. */
function buildDb(path: string, model: ContentModel, source: SourceInfo): string {
  rmSync(path, { force: true });
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  try {
    db.exec('PRAGMA journal_mode = DELETE');
    writeContentDb(db, model, { version: APP_CONFIG.content.version, sourceCommit: source.commit });
    db.exec('VACUUM');
    return contentFingerprint(db);
  } finally {
    db.close();
  }
}

function inspectDb(path: string): { version: number; fingerprint: string } {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    return { version: readContentVersion(db), fingerprint: contentFingerprint(db) };
  } finally {
    db.close();
  }
}

function build(): void {
  const { model, source, dorar } = loadModel();
  const version = APP_CONFIG.content.version;
  // Same folder as the target, so the final rename never crosses drives.
  const tmp = `${DB_PATH}.${process.pid}.tmp`;
  const fingerprint = buildDb(tmp, model, source);

  const lock = existsSync(LOCK_PATH) ? readJson<Lock>(LOCK_PATH) : null;
  if (lock && lock.version === version && lock.fingerprint !== fingerprint) {
    rmSync(tmp, { force: true });
    throw new Error(
      `Content changed but the version is still ${version}.\n` +
        'Bump APP_CONFIG.content.version in src/config/app-config.ts, then run this again.\n' +
        '(Otherwise devices that already have this version keep the old content.)',
    );
  }

  mkdirSync(dirname(DB_PATH), { recursive: true });
  rmSync(DB_PATH, { force: true });
  renameSync(tmp, DB_PATH);
  writeFileSync(LOCK_PATH, JSON.stringify({ version, fingerprint } satisfies Lock, null, 2) + '\n');
  writeFileSync(REPORT_PATH, renderChangesReport(model, version, source.commit));
  writeFileSync(REVIEW_PATH, renderSourcesReview(model, dorar));

  console.log(
    `content.db v${version}: ${model.categories.length} categories, ${model.adhkar.length} adhkar, ` +
      `${model.audioFiles.length} audio files, ${model.messages?.length ?? 0} Adwamuha messages, ` +
      `${model.texts?.length ?? 0} Adwamuha texts, ` +
      `${model.changes.length} logged changes.`,
  );
}

function check(): void {
  const { model, source, dorar } = loadModel();
  const version = APP_CONFIG.content.version;
  const tmp = join(tmpdir(), `wirduk-content-check-${process.pid}.db`);
  const fingerprint = buildDb(tmp, model, source);
  rmSync(tmp, { force: true });

  const errors: string[] = [];
  const lock = existsSync(LOCK_PATH) ? readJson<Lock>(LOCK_PATH) : null;
  if (!lock) errors.push('content-source/content-lock.json is missing.');
  else if (lock.fingerprint !== fingerprint) {
    errors.push(
      lock.version === version
        ? `Content changed but the version is still ${version}. Bump APP_CONFIG.content.version and run npm run content:build.`
        : 'Content is out of date. Run npm run content:build.',
    );
  } else if (lock.version !== version) {
    errors.push('APP_CONFIG.content.version changed. Run npm run content:build.');
  }

  if (!existsSync(DB_PATH)) errors.push('assets/db/content.db is missing.');
  else {
    const shipped = inspectDb(DB_PATH);
    if (shipped.fingerprint !== fingerprint) errors.push('assets/db/content.db is out of date.');
    if (shipped.version !== version) {
      errors.push(`assets/db/content.db has version ${shipped.version}, config has ${version}.`);
    }
  }

  const report = renderChangesReport(model, version, source.commit);
  if (!existsSync(REPORT_PATH) || readFileSync(REPORT_PATH, 'utf8') !== report) {
    errors.push('docs/content-changes.md is out of date.');
  }
  const review = renderSourcesReview(model, dorar);
  if (!existsSync(REVIEW_PATH) || readFileSync(REVIEW_PATH, 'utf8') !== review) {
    errors.push('docs/sources-review.md is out of date.');
  }

  if (errors.length > 0) {
    console.error(`Content check failed:\n- ${errors.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`Content check OK (v${version}).`);
}

try {
  if (process.argv.includes('--check')) check();
  else build();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
