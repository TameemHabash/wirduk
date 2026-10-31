import { createUserDb } from '@/test-utils/databases';

import { SessionRepository } from './repositories/user-repositories';
import { SESSION_MAX_AGE_MS, isFresh, parseSession } from './session';

describe('saved session', () => {
  const session = { categoryId: 1, dhikrId: 1017, counts: { '1017': 40 } };

  it('is fresh for at most 5 hours', () => {
    const savedAt = 1_000_000_000;
    expect(isFresh({ ...session, savedAt }, savedAt + 1000)).toBe(true);
    expect(isFresh({ ...session, savedAt }, savedAt + SESSION_MAX_AGE_MS)).toBe(true);
    expect(isFresh({ ...session, savedAt }, savedAt + SESSION_MAX_AGE_MS + 1)).toBe(false);
    // A clock moved far back: too old to trust.
    expect(isFresh({ ...session, savedAt }, savedAt - 10 * 60_000)).toBe(false);
  });

  it('ignores damaged data and counts that are not positive whole numbers', () => {
    expect(parseSession('{broken', 1)).toBeNull();
    expect(parseSession('{"categoryId":1}', 1)).toBeNull();
    expect(
      parseSession('{"categoryId":-3,"dhikrId":-7,"counts":{"-7":2,"-8":0,"x":1,"-9":1.5}}', 5),
    ).toEqual({ categoryId: -3, dhikrId: -7, counts: { '-7': 2 }, savedAt: 5 });
  });

  it('keeps an Adwamuha ward, and ignores a damaged one', () => {
    expect(parseSession('{"categoryId":1,"dhikrId":1012,"counts":{},"ward":"morning"}', 1)).toEqual(
      {
        categoryId: 1,
        dhikrId: 1012,
        counts: {},
        ward: 'morning',
        savedAt: 1,
      },
    );
    expect(parseSession('{"categoryId":1,"dhikrId":1012,"counts":{},"ward":"noon"}', 1)).toEqual({
      categoryId: 1,
      dhikrId: 1012,
      counts: {},
      savedAt: 1,
    });
  });

  it('is stored as one row: saved, read back, cleared', async () => {
    const repo = new SessionRepository(await createUserDb(), () => 42);
    expect(await repo.load()).toBeNull();
    await repo.save(session);
    await repo.save({ ...session, dhikrId: 1018 });
    expect(await repo.load()).toEqual({ ...session, dhikrId: 1018, savedAt: 42 });
    await repo.clear();
    expect(await repo.load()).toBeNull();
  });
});
