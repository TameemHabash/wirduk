import { openShippedContentDb } from '../databases';

import { CATEGORY, DHIKR } from './content';

/** The named ids say what the shipped content holds (a content change that moves them fails here). */
describe('named content ids', () => {
  const db = openShippedContentDb();
  const dhikr = (id: number) =>
    db.getFirst<{
      categoryId: number;
      count: number;
      audio: string | null;
      sources: number;
      fadl: number;
    }>(
      `SELECT CategoryId AS categoryId, Count AS count, AudioFile AS audio,
              (SELECT COUNT(*) FROM DhikrSources s
                WHERE s.DhikrId = a.Id AND s.Source IS NOT NULL) AS sources,
              (SELECT COUNT(*) FROM DhikrSources s
                WHERE s.DhikrId = a.Id AND s.Fadl IS NOT NULL) AS fadl
         FROM Adhkar a WHERE Id = ?`,
      [id],
    );
  const size = async (categoryId: number) =>
    (await db.getFirst<{ n: number }>('SELECT COUNT(*) AS n FROM Adhkar WHERE CategoryId = ?', [
      categoryId,
    ]))!.n;

  it('the chapters', async () => {
    expect(await size(CATEGORY.morning)).toBe(24);
    expect(await size(CATEGORY.evening)).toBe(22);
    expect(await size(CATEGORY.firstListed)).toBe(13);
    expect(await size(CATEGORY.oneDhikr)).toBe(1);
    expect(await dhikr(4001)).toMatchObject({ categoryId: CATEGORY.oneDhikr, count: 1 });
  });

  it('the adhkar', async () => {
    expect(await dhikr(DHIKR.morningOpening)).toMatchObject({
      categoryId: CATEGORY.morning,
      count: 1,
      sources: 0,
    });
    expect(await dhikr(DHIKR.eveningOpening)).toMatchObject({
      categoryId: CATEGORY.evening,
      count: 1,
    });
    expect(await dhikr(DHIKR.ayatAlKursi)).toMatchObject({
      categoryId: CATEGORY.morning,
      count: 1,
      audio: '1001.m4a',
    });
    expect(await dhikr(DHIKR.threeQuls)).toMatchObject({ count: 3, sources: 1, fadl: 1 });
    expect(await dhikr(DHIKR.raditu)).toMatchObject({ count: 3, sources: 1 });
    expect(await dhikr(DHIKR.hundredTimes)).toMatchObject({ count: 100 });
    expect(await dhikr(DHIKR.eveningAyatAlKursi)).toMatchObject({
      categoryId: CATEGORY.evening,
      audio: '1001.m4a',
    });
  });
});
