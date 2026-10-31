/**
 * Test-only database factories. Never import this from app code.
 */
import { join } from 'node:path';

import { migrate } from '@/data/db/migrate';
import { USER_MIGRATIONS } from '@/data/db/user-schema';

import { writeContentDb } from '../../scripts/content/lib/write-db';
import type { ContentModel } from '../../scripts/content/lib/types';

import { createNodeSqlDatabase } from './node-sql';

/** Fresh, migrated user database in memory. */
export async function createUserDb() {
  const db = createNodeSqlDatabase();
  await migrate(db, USER_MIGRATIONS);
  return db;
}

/** The real shipped content database (assets/db/content.db), read-only. */
export function openShippedContentDb() {
  return createNodeSqlDatabase(join(__dirname, '..', '..', 'assets', 'db', 'content.db'), {
    readOnly: true,
  });
}

/** Content database in memory, built from a small model. */
export function createContentDb(model: ContentModel, version = 1) {
  const db = createNodeSqlDatabase();
  writeContentDb(db.raw, model, { version, sourceCommit: 'test' });
  return db;
}
