import { toSearchText } from '@/text/normalize';

import { fromCustomId, isCustomId, toCustomId } from '../custom-ids';
import type { SqlDatabase } from '../db/sql';
import type { Category, CustomDhikrInput, Dhikr, SearchResults } from '../models';
import { queryWords } from '../search/fts-query';

import type { Clock } from './user-repositories';

export const CUSTOM_LIMITS = {
  titleMax: 120,
  textMax: 10_000,
  noteMax: 4_000,
  countMax: 100_000,
} as const;

export type CustomErrorCode =
  | 'emptyTitle'
  | 'titleTooLong'
  | 'emptyText'
  | 'textTooLong'
  | 'badCount'
  | 'noteTooLong'
  | 'notFound';

/** A validation or lookup problem; `code` maps to a message in the UI. */
export class CustomContentError extends Error {
  readonly code: CustomErrorCode;
  constructor(code: CustomErrorCode) {
    super(code);
    this.code = code;
  }
}

function checkTitle(title: string): string {
  const t = title.trim();
  if (!t) throw new CustomContentError('emptyTitle');
  if (t.length > CUSTOM_LIMITS.titleMax) throw new CustomContentError('titleTooLong');
  return t;
}

function checkNote(note: string | null | undefined): string | null {
  const n = note?.trim() ?? '';
  if (n.length > CUSTOM_LIMITS.noteMax) throw new CustomContentError('noteTooLong');
  return n || null;
}

function checkDhikr(input: CustomDhikrInput) {
  const text = input.text.trim();
  if (!text) throw new CustomContentError('emptyText');
  if (text.length > CUSTOM_LIMITS.textMax) throw new CustomContentError('textTooLong');
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > CUSTOM_LIMITS.countMax) {
    throw new CustomContentError('badCount');
  }
  return {
    text,
    count: input.count,
    fadl: checkNote(input.fadl),
    source: checkNote(input.source),
    audioFile: input.audioFile ?? null,
  };
}

function rowIdOf(id: number): number {
  if (!isCustomId(id)) throw new CustomContentError('notFound');
  return fromCustomId(id);
}

interface CategoryRow {
  rowId: number;
  title: string;
  sortOrder: number;
  adhkarCount: number;
}

interface DhikrRow {
  rowId: number;
  categoryRowId: number;
  sortOrder: number;
  count: number;
  text: string;
  fadl: string | null;
  source: string | null;
  audioFile: string | null;
}

const toCategory = (r: CategoryRow): Category => ({
  id: toCustomId(r.rowId),
  title: r.title,
  defaultOrder: r.sortOrder,
  adhkarCount: r.adhkarCount,
  custom: true,
});

const toDhikr = (r: DhikrRow): Dhikr => ({
  id: toCustomId(r.rowId),
  categoryId: toCustomId(r.categoryRowId),
  order: r.sortOrder,
  count: r.count,
  text: r.text,
  audioFile: r.audioFile,
  // The user's own recording: one play says the dhikr once.
  audioRepeats: 1,
  source:
    r.fadl || r.source ? { fadl: r.fadl, source: r.source, grading: null, dorarUrl: null } : null,
  custom: true,
});

const CATEGORY_SELECT = `
  SELECT c.Id AS rowId, c.Title AS title, c.SortOrder AS sortOrder,
         (SELECT COUNT(*) FROM CustomAdhkar a WHERE a.CategoryId = c.Id) AS adhkarCount
    FROM CustomCategories c`;

const DHIKR_SELECT = `
  SELECT Id AS rowId, CategoryId AS categoryRowId, SortOrder AS sortOrder, Count AS count,
         Text AS text, Fadl AS fadl, Source AS source, AudioFile AS audioFile
    FROM CustomAdhkar`;

/**
 * The user's own categories and adhkar (user database, never replaced).
 * Ids going in and out are the app's negative custom ids.
 */
export class CustomRepository {
  private readonly db: SqlDatabase;
  private readonly now: Clock;

  constructor(db: SqlDatabase, now: Clock = () => Date.now()) {
    this.db = db;
    this.now = now;
  }

  // ---- Categories ----

  async listCategories(): Promise<Category[]> {
    const rows = await this.db.getAll<CategoryRow>(`${CATEGORY_SELECT} ORDER BY c.SortOrder, c.Id`);
    return rows.map(toCategory);
  }

  async getCategory(id: number): Promise<Category | null> {
    if (!isCustomId(id)) return null;
    const row = await this.db.getFirst<CategoryRow>(`${CATEGORY_SELECT} WHERE c.Id = ?`, [
      fromCustomId(id),
    ]);
    return row ? toCategory(row) : null;
  }

  async createCategory(title: string): Promise<Category> {
    const t = checkTitle(title);
    const time = this.now();
    const rowId = await this.db.transaction(async (tx) => {
      const next = await tx.getFirst<{ next: number }>(
        'SELECT COALESCE(MAX(SortOrder), 0) + 1 AS next FROM CustomCategories',
      );
      const r = await tx.run(
        `INSERT INTO CustomCategories (Title, SearchTitle, SortOrder, CreatedAt, UpdatedAt)
         VALUES (?, ?, ?, ?, ?)`,
        [t, toSearchText(t), next?.next ?? 1, time, time],
      );
      return r.lastInsertRowId;
    });
    return (await this.getCategory(toCustomId(rowId)))!;
  }

  async renameCategory(id: number, title: string): Promise<void> {
    const t = checkTitle(title);
    const r = await this.db.run(
      'UPDATE CustomCategories SET Title = ?, SearchTitle = ?, UpdatedAt = ? WHERE Id = ?',
      [t, toSearchText(t), this.now(), rowIdOf(id)],
    );
    if (r.changes === 0) throw new CustomContentError('notFound');
  }

  /** Deletes the category and its adhkar. Returns their audio files, to delete from storage. */
  async deleteCategory(id: number): Promise<{ audioFiles: string[] }> {
    const rowId = rowIdOf(id);
    return this.db.transaction(async (tx) => {
      const files = await tx.getAll<{ audioFile: string }>(
        'SELECT AudioFile AS audioFile FROM CustomAdhkar WHERE CategoryId = ? AND AudioFile IS NOT NULL',
        [rowId],
      );
      await tx.run('DELETE FROM CustomAdhkar WHERE CategoryId = ?', [rowId]);
      const r = await tx.run('DELETE FROM CustomCategories WHERE Id = ?', [rowId]);
      if (r.changes === 0) throw new CustomContentError('notFound');
      return { audioFiles: files.map((f) => f.audioFile) };
    });
  }

  /** Saves the order of the user's categories (ids in the new order). */
  async reorderCategories(ids: readonly number[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx.run('UPDATE CustomCategories SET SortOrder = ? WHERE Id = ?', [
          i + 1,
          rowIdOf(ids[i]!),
        ]);
      }
    });
  }

  // ---- Adhkar ----

  async listAdhkar(categoryId: number): Promise<Dhikr[]> {
    if (!isCustomId(categoryId)) return [];
    const rows = await this.db.getAll<DhikrRow>(
      `${DHIKR_SELECT} WHERE CategoryId = ? ORDER BY SortOrder, Id`,
      [fromCustomId(categoryId)],
    );
    return rows.map(toDhikr);
  }

  async getDhikr(id: number): Promise<Dhikr | null> {
    if (!isCustomId(id)) return null;
    const row = await this.db.getFirst<DhikrRow>(`${DHIKR_SELECT} WHERE Id = ?`, [
      fromCustomId(id),
    ]);
    return row ? toDhikr(row) : null;
  }

  async createDhikr(categoryId: number, input: CustomDhikrInput): Promise<Dhikr> {
    const d = checkDhikr(input);
    const catRowId = rowIdOf(categoryId);
    const time = this.now();
    const rowId = await this.db.transaction(async (tx) => {
      const exists = await tx.getFirst('SELECT 1 FROM CustomCategories WHERE Id = ?', [catRowId]);
      if (!exists) throw new CustomContentError('notFound');
      const next = await tx.getFirst<{ next: number }>(
        'SELECT COALESCE(MAX(SortOrder), 0) + 1 AS next FROM CustomAdhkar WHERE CategoryId = ?',
        [catRowId],
      );
      const r = await tx.run(
        `INSERT INTO CustomAdhkar
           (CategoryId, Text, SearchText, Count, Fadl, Source, AudioFile, SortOrder, CreatedAt, UpdatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          catRowId,
          d.text,
          toSearchText(d.text),
          d.count,
          d.fadl,
          d.source,
          d.audioFile,
          next?.next ?? 1,
          time,
          time,
        ],
      );
      return r.lastInsertRowId;
    });
    return (await this.getDhikr(toCustomId(rowId)))!;
  }

  /**
   * Replaces all fields of a dhikr. Returns the old audio file when it was
   * replaced or removed, so the caller can delete it from storage.
   */
  async updateDhikr(
    id: number,
    input: CustomDhikrInput,
  ): Promise<{ dhikr: Dhikr; oldAudioFile: string | null }> {
    const d = checkDhikr(input);
    const current = await this.getDhikr(id);
    if (!current) throw new CustomContentError('notFound');
    await this.db.run(
      `UPDATE CustomAdhkar
          SET Text = ?, SearchText = ?, Count = ?, Fadl = ?, Source = ?, AudioFile = ?, UpdatedAt = ?
        WHERE Id = ?`,
      [
        d.text,
        toSearchText(d.text),
        d.count,
        d.fadl,
        d.source,
        d.audioFile,
        this.now(),
        rowIdOf(id),
      ],
    );
    const oldAudioFile =
      current.audioFile && current.audioFile !== d.audioFile ? current.audioFile : null;
    return { dhikr: (await this.getDhikr(id))!, oldAudioFile };
  }

  /** Deletes a dhikr. Returns its audio file, to delete from storage. */
  async deleteDhikr(id: number): Promise<{ audioFile: string | null }> {
    const current = await this.getDhikr(id);
    if (!current) throw new CustomContentError('notFound');
    await this.db.run('DELETE FROM CustomAdhkar WHERE Id = ?', [rowIdOf(id)]);
    return { audioFile: current.audioFile };
  }

  /** Saves the order of a category's adhkar (ids in the new order). */
  async reorderAdhkar(categoryId: number, ids: readonly number[]): Promise<void> {
    const catRowId = rowIdOf(categoryId);
    await this.db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx.run('UPDATE CustomAdhkar SET SortOrder = ? WHERE Id = ? AND CategoryId = ?', [
          i + 1,
          rowIdOf(ids[i]!),
          catRowId,
        ]);
      }
    });
  }

  // ---- Search ----

  /** Tashkeel-insensitive; every word must match the start of a word. */
  async search(input: string, limit = 50): Promise<SearchResults> {
    const words = queryWords(input);
    if (words.length === 0) return { categories: [], adhkar: [] };
    const like = (column: string) =>
      words.map(() => `(' ' || ${column} || ' ') LIKE ?`).join(' AND ');
    const params = words.map((w) => `% ${w}%`);

    const categories = await this.db.getAll<{ rowId: number; title: string }>(
      `SELECT Id AS rowId, Title AS title FROM CustomCategories
        WHERE ${like('SearchTitle')} ORDER BY SortOrder LIMIT ?`,
      [...params, limit],
    );
    const adhkar = await this.db.getAll<{
      rowId: number;
      categoryRowId: number;
      categoryTitle: string;
      sortOrder: number;
      text: string;
    }>(
      `SELECT a.Id AS rowId, a.CategoryId AS categoryRowId, c.Title AS categoryTitle,
              a.SortOrder AS sortOrder, a.Text AS text
         FROM CustomAdhkar a JOIN CustomCategories c ON c.Id = a.CategoryId
        WHERE ${like('a.SearchText')}
        ORDER BY c.SortOrder, a.SortOrder LIMIT ?`,
      [...params, limit],
    );

    return {
      categories: categories.map((c) => ({
        categoryId: toCustomId(c.rowId),
        title: c.title,
        custom: true,
      })),
      adhkar: adhkar.map((a) => ({
        dhikrId: toCustomId(a.rowId),
        categoryId: toCustomId(a.categoryRowId),
        categoryTitle: a.categoryTitle,
        order: a.sortOrder,
        text: a.text,
        custom: true,
      })),
    };
  }
}
