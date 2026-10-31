import { DatabaseSync } from 'node:sqlite';

import { contentFingerprint, readContentVersion, writeContentDb } from './write-db';
import type { ContentModel } from './types';

function model(): ContentModel {
  return {
    categories: [{ id: 1, sortOrder: 1, audioFile: 'c1', titles: { ar: 'أذكار الصباح' } }],
    adhkar: [
      {
        id: 1001,
        categoryId: 1,
        sortOrder: 1,
        count: 3,
        audioFile: 'a',
        texts: { ar: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ' },
      },
      {
        id: 1002,
        categoryId: 1,
        sortOrder: 2,
        count: 1,
        audioFile: null,
        texts: { ar: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ' },
      },
    ],
    audioFiles: [{ lang: 'ar', fileName: 'a', bytes: 1234, repeats: 1 }],
    changes: [],
    sources: [
      {
        dhikrId: 1001,
        lang: 'ar',
        fadl: null,
        source: 'صحيح مسلم (2692) — الراوي: أبو هريرة',
        grading: 'صحيح — مسلم',
        dorarUrl: 'https://dorar.net/hadith/sharh/1',
      },
    ],
  };
}

function build(m = model(), version = 1) {
  const db = new DatabaseSync(':memory:');
  writeContentDb(db, m, { version, sourceCommit: 'abc' });
  return db;
}

describe('writeContentDb', () => {
  it('stores display text unchanged and a separate search form', () => {
    const db = build();
    const row = db
      .prepare('SELECT Text, SearchText FROM DhikrTranslations WHERE DhikrId = 1001')
      .get() as { Text: string; SearchText: string };
    expect(row.Text).toBe('سُبْحَانَ اللَّهِ وَبِحَمْدِهِ');
    expect(row.SearchText).toBe('سبحان الله وبحمده');
  });

  it('builds a working FTS5 index (tashkeel-insensitive, prefix search)', () => {
    const db = build();
    const find = (q: string) =>
      (
        db
          .prepare('SELECT DhikrId FROM DhikrSearch WHERE DhikrSearch MATCH ? ORDER BY DhikrId')
          .all(q) as {
          DhikrId: number;
        }[]
      ).map((r) => r.DhikrId);
    expect(find('"سبحان"')).toEqual([1001]);
    expect(find('"استغ"*')).toEqual([1002]);
    expect(find('"الله"')).toEqual([1001, 1002]);
  });

  it('stores the version and the search title', () => {
    const db = build(model(), 4);
    expect(readContentVersion(db)).toBe(4);
    const row = db.prepare('SELECT SearchTitle FROM CategoryTranslations').get() as {
      SearchTitle: string;
    };
    expect(row.SearchTitle).toBe('اذكار الصباح');
  });

  it('stores the Dorar source of a dhikr', () => {
    const db = build();
    expect(db.prepare('SELECT * FROM DhikrSources').all()).toEqual([
      {
        DhikrId: 1001,
        Lang: 'ar',
        Fadl: null,
        Source: 'صحيح مسلم (2692) — الراوي: أبو هريرة',
        Grading: 'صحيح — مسلم',
        DorarUrl: 'https://dorar.net/hadith/sharh/1',
      },
    ]);
  });

  it('keeps null audio as null', () => {
    const db = build();
    const row = db.prepare('SELECT AudioFile FROM Adhkar WHERE Id = 1002').get() as {
      AudioFile: unknown;
    };
    expect(row.AudioFile).toBeNull();
  });

  it('rolls back everything when an insert fails', () => {
    const bad = model();
    bad.adhkar[1]!.count = 0; // violates CHECK (Count >= 1)
    const db = new DatabaseSync(':memory:');
    expect(() => writeContentDb(db, bad, { version: 1, sourceCommit: 'abc' })).toThrow();
    expect(db.prepare('SELECT COUNT(*) AS n FROM Adhkar').get()).toEqual({ n: 0 });
  });
});

describe('contentFingerprint', () => {
  it('is the same for the same content, whatever the version', () => {
    expect(contentFingerprint(build(model(), 1))).toBe(contentFingerprint(build(model(), 2)));
  });

  it('changes when any text changes', () => {
    const changed = model();
    changed.adhkar[0]!.texts.ar = 'سُبْحَانَ اللَّهِ';
    expect(contentFingerprint(build(changed))).not.toBe(contentFingerprint(build()));
  });

  it('changes when a source changes', () => {
    const changed = model();
    changed.sources[0]!.fadl = 'فضل';
    expect(contentFingerprint(build(changed))).not.toBe(contentFingerprint(build()));
  });

  it('changes when a count changes', () => {
    const changed = model();
    changed.adhkar[0]!.count = 33;
    expect(contentFingerprint(build(changed))).not.toBe(contentFingerprint(build()));
  });
});
