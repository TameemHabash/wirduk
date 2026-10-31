import { DEFAULT_LANGUAGE } from '@/i18n/languages';

import type { SqlDatabase } from '../db/sql';
import {
  ADWAMUHA_MOMENTS,
  type AdwamuhaMessage,
  type AdwamuhaMoment,
  type AdwamuhaText,
  type AudioFileInfo,
  type Category,
  type CategorySearchHit,
  type DefaultPlan,
  type Dhikr,
  type DhikrSearchHit,
  type PlanStage,
  type PlanStep,
  type SearchResults,
} from '../models';
import { buildFtsQuery, queryWords } from '../search/fts-query';

interface DhikrRow {
  id: number;
  categoryId: number;
  order: number;
  count: number;
  audioFile: string | null;
  audioRepeats: number;
  text: string;
  fadl: string | null;
  source: string | null;
  grading: string | null;
  dorarUrl: string | null;
}

function toDhikr(r: DhikrRow): Dhikr {
  const hasSource = r.fadl != null || r.source != null || r.grading != null || r.dorarUrl != null;
  return {
    id: r.id,
    categoryId: r.categoryId,
    order: r.order,
    count: r.count,
    text: r.text,
    audioFile: r.audioFile,
    audioRepeats: r.audioRepeats,
    source: hasSource
      ? { fadl: r.fadl, source: r.source, grading: r.grading, dorarUrl: r.dorarUrl }
      : null,
    custom: false,
  };
}

interface MessageRow {
  id: string;
  kind: AdwamuhaMessage['kind'];
  moments: string;
  text: string;
  sura: number | null;
  suraName: string | null;
  fromAya: number | null;
  toAya: number | null;
  rawi: string | null;
  muhaddith: string | null;
  book: string | null;
  number: string | null;
  grading: string | null;
  dorarUrl: string | null;
}

function toAdwamuhaMessage(r: MessageRow): AdwamuhaMessage {
  const isVerse = r.kind === 'verse';
  return {
    id: r.id,
    kind: r.kind,
    moments: r.moments
      .split(' ')
      .filter((m): m is AdwamuhaMoment => (ADWAMUHA_MOMENTS as readonly string[]).includes(m)),
    texts: isVerse ? r.text.split('\n') : [r.text],
    verse:
      isVerse && r.sura != null
        ? { sura: r.sura, suraName: r.suraName ?? '', from: r.fromAya ?? 0, to: r.toAya ?? 0 }
        : null,
    hadith: isVerse
      ? null
      : {
          rawi: r.rawi ?? '',
          muhaddith: r.muhaddith ?? '',
          book: r.book ?? '',
          number: r.number ?? '',
          grading: r.grading ?? '',
          dorarUrl: r.dorarUrl ?? '',
        },
  };
}

type CategoryRow = Omit<Category, 'custom'>;
const toCategory = (r: CategoryRow): Category => ({ ...r, custom: false });

/**
 * Read-only access to the shipped content database.
 *
 * Every text is read in the requested language, falling back to the default
 * language when a translation is missing.
 */
export class ContentRepository {
  private readonly db: SqlDatabase;
  private readonly fallbackLang: string;

  constructor(db: SqlDatabase, fallbackLang: string = DEFAULT_LANGUAGE) {
    this.db = db;
    this.fallbackLang = fallbackLang;
  }

  /** All categories in the default order. */
  async listCategories(lang: string): Promise<Category[]> {
    const rows = await this.db.getAll<CategoryRow>(
      `SELECT c.Id AS id,
              COALESCE(t.Title, f.Title) AS title,
              c.SortOrder AS defaultOrder,
              (SELECT COUNT(*) FROM Adhkar a WHERE a.CategoryId = c.Id) AS adhkarCount
         FROM Categories c
         LEFT JOIN CategoryTranslations t ON t.CategoryId = c.Id AND t.Lang = ?
         LEFT JOIN CategoryTranslations f ON f.CategoryId = c.Id AND f.Lang = ?
        WHERE COALESCE(t.Title, f.Title) IS NOT NULL
        ORDER BY c.SortOrder`,
      [lang, this.fallbackLang],
    );
    return rows.map(toCategory);
  }

  async getCategory(id: number, lang: string): Promise<Category | null> {
    const row = await this.db.getFirst<CategoryRow>(
      `SELECT c.Id AS id,
              COALESCE(t.Title, f.Title) AS title,
              c.SortOrder AS defaultOrder,
              (SELECT COUNT(*) FROM Adhkar a WHERE a.CategoryId = c.Id) AS adhkarCount
         FROM Categories c
         LEFT JOIN CategoryTranslations t ON t.CategoryId = c.Id AND t.Lang = ?
         LEFT JOIN CategoryTranslations f ON f.CategoryId = c.Id AND f.Lang = ?
        WHERE c.Id = ? AND COALESCE(t.Title, f.Title) IS NOT NULL`,
      [lang, this.fallbackLang, id],
    );
    return row ? toCategory(row) : null;
  }

  /**
   * Adhkar of a category, in order, with their sources.
   * `audioFile` is null when the language has no recording for the dhikr.
   */
  async listAdhkar(categoryId: number, lang: string): Promise<Dhikr[]> {
    const rows = await this.db.getAll<DhikrRow>(
      `${DHIKR_SELECT}
        WHERE a.CategoryId = ? AND COALESCE(t.Text, f.Text) IS NOT NULL
        ORDER BY a.SortOrder`,
      [lang, lang, this.fallbackLang, lang, this.fallbackLang, categoryId],
    );
    return rows.map(toDhikr);
  }

  async getDhikr(id: number, lang: string): Promise<Dhikr | null> {
    const row = await this.db.getFirst<DhikrRow>(
      `${DHIKR_SELECT}
        WHERE a.Id = ? AND COALESCE(t.Text, f.Text) IS NOT NULL`,
      [lang, lang, this.fallbackLang, lang, this.fallbackLang, id],
    );
    return row ? toDhikr(row) : null;
  }

  /**
   * Tashkeel-insensitive search in category titles and dhikr texts.
   * Every word must match; each word also matches longer words starting with it.
   */
  async search(input: string, lang: string, limit = 50): Promise<SearchResults> {
    const fts = buildFtsQuery(input);
    if (!fts) return { categories: [], adhkar: [] };
    const words = queryWords(input);

    // Words are letters/digits only (normalized), so they are safe in LIKE patterns.
    const titleConditions = words.map(() => `(' ' || SearchTitle || ' ') LIKE ?`).join(' AND ');
    const categoryRows = await this.db.getAll<Omit<CategorySearchHit, 'custom'>>(
      `SELECT t.CategoryId AS categoryId, t.Title AS title
         FROM CategoryTranslations t
         JOIN Categories c ON c.Id = t.CategoryId
        WHERE t.Lang = ? AND ${titleConditions}
        ORDER BY c.SortOrder
        LIMIT ?`,
      [lang, ...words.map((w) => `% ${w}%`), limit],
    );

    const dhikrRows = await this.db.getAll<Omit<DhikrSearchHit, 'custom'>>(
      `SELECT a.Id AS dhikrId,
              a.CategoryId AS categoryId,
              ct.Title AS categoryTitle,
              a.SortOrder AS "order",
              t.Text AS text
         FROM DhikrSearch s
         JOIN Adhkar a ON a.Id = s.DhikrId
         JOIN Categories c ON c.Id = a.CategoryId
         JOIN DhikrTranslations t ON t.DhikrId = a.Id AND t.Lang = s.Lang
         JOIN CategoryTranslations ct ON ct.CategoryId = a.CategoryId AND ct.Lang = s.Lang
        WHERE DhikrSearch MATCH ? AND s.Lang = ?
        ORDER BY bm25(DhikrSearch), c.SortOrder, a.SortOrder
        LIMIT ?`,
      [fts, lang, limit],
    );

    return {
      categories: categoryRows.map((c) => ({ ...c, custom: false })),
      adhkar: dhikrRows.map((d) => ({ ...d, custom: false })),
    };
  }

  /**
   * Adwamuha's default plan: its stages and steps (step 0 is the opening).
   * Users get their own copy when they turn the feature on; this is only the
   * default, used to make that copy and to reset it.
   */
  async getDefaultPlan(lang: string): Promise<DefaultPlan> {
    const stages = await this.db.getAll<PlanStage>(
      `SELECT s.Stage AS stage, s.Weeks AS weeks, COALESCE(t.Title, f.Title) AS title
         FROM PlanStages s
         LEFT JOIN PlanStageTranslations t ON t.Stage = s.Stage AND t.Lang = ?
         LEFT JOIN PlanStageTranslations f ON f.Stage = s.Stage AND f.Lang = ?
        ORDER BY s.Stage`,
      [lang, this.fallbackLang],
    );
    const steps = await this.db.getAll<PlanStep>(
      `SELECT Step AS step, Stage AS stage,
              MorningDhikrId AS morningDhikrId, EveningDhikrId AS eveningDhikrId
         FROM PlanSteps ORDER BY Step`,
    );
    return { stages, steps };
  }

  /**
   * Adwamuha's approved messages in a language (the fallback language's when
   * it has none), in a stable order.
   */
  async listAdwamuhaMessages(lang: string): Promise<AdwamuhaMessage[]> {
    const select = (l: string) =>
      this.db.getAll<MessageRow>(
        `SELECT Id AS id, Kind AS kind, Moments AS moments, Text AS text,
                Sura AS sura, SuraName AS suraName, FromAya AS fromAya, ToAya AS toAya,
                Rawi AS rawi, Muhaddith AS muhaddith, Book AS book, Number AS number,
                Grading AS grading, DorarUrl AS dorarUrl
           FROM AdwamuhaMessages WHERE Lang = ? ORDER BY Id`,
        [l],
      );
    let rows = await select(lang);
    if (rows.length === 0 && lang !== this.fallbackLang) rows = await select(this.fallbackLang);
    return rows.map(toAdwamuhaMessage);
  }

  /** Adwamuha's own messages and tips in a language (the fallback language's when it has none). */
  async listAdwamuhaTexts(lang: string): Promise<AdwamuhaText[]> {
    const select = (l: string) =>
      this.db.getAll<AdwamuhaText>(
        `SELECT Id AS id, Moment AS moment, State AS state, Text AS text
           FROM AdwamuhaTexts WHERE Lang = ? ORDER BY Id`,
        [l],
      );
    const rows = await select(lang);
    return rows.length > 0 || lang === this.fallbackLang ? rows : select(this.fallbackLang);
  }

  /**
   * Audio files used by the adhkar of a language (what "download all" fetches), or only by
   * those of `categoryIds` (the morning and evening download). Sizes come from the content
   * database, so they follow new recordings.
   */
  async listAudioFiles(lang: string, categoryIds?: readonly number[]): Promise<AudioFileInfo[]> {
    if (categoryIds?.length === 0) return [];
    const inCategories = categoryIds
      ? `AND a.CategoryId IN (${categoryIds.map(() => '?').join(', ')})`
      : '';
    return this.db.getAll<AudioFileInfo>(
      `SELECT af.Lang AS lang, af.FileName AS fileName, af.Bytes AS bytes
         FROM AudioFiles af
        WHERE af.Lang = ?
          AND EXISTS (SELECT 1 FROM Adhkar a WHERE a.AudioFile = af.FileName ${inCategories})
        ORDER BY af.FileName`,
      [lang, ...(categoryIds ?? [])],
    );
  }

  getAudioFile(lang: string, fileName: string): Promise<AudioFileInfo | null> {
    return this.db.getFirst<AudioFileInfo>(
      `SELECT Lang AS lang, FileName AS fileName, Bytes AS bytes
         FROM AudioFiles WHERE Lang = ? AND FileName = ?`,
      [lang, fileName],
    );
  }
}

/**
 * Shared SELECT for adhkar. Parameters, in order:
 *  1. audio language, 2. text language, 3. fallback text language,
 *  4. text language and 5. fallback language again (to pick the source in the
 *  same language as the text that is shown).
 */
const DHIKR_SELECT = `
  SELECT a.Id AS id,
         a.CategoryId AS categoryId,
         a.SortOrder AS "order",
         a.Count AS count,
         af.FileName AS audioFile,
         COALESCE(af.Repeats, 1) AS audioRepeats,
         COALESCE(t.Text, f.Text) AS text,
         s.Fadl AS fadl,
         s.Source AS source,
         s.Grading AS grading,
         s.DorarUrl AS dorarUrl
    FROM Adhkar a
    LEFT JOIN AudioFiles af ON af.FileName = a.AudioFile AND af.Lang = ?
    LEFT JOIN DhikrTranslations t ON t.DhikrId = a.Id AND t.Lang = ?
    LEFT JOIN DhikrTranslations f ON f.DhikrId = a.Id AND f.Lang = ?
    LEFT JOIN DhikrSources s ON s.DhikrId = a.Id
         AND s.Lang = CASE WHEN t.Text IS NOT NULL THEN ? ELSE ? END`;
