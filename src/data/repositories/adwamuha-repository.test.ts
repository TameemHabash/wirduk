import { startPlan } from '@/features/adwamuha/logic/progress';
import { createUserDb } from '@/test-utils/databases';
import { day, planOf, rec } from '@/test-utils/adwamuha';

import { AdwamuhaRepository, type AdwamuhaStored } from './adwamuha-repository';

const stored = (extra: Partial<AdwamuhaStored> = {}): AdwamuhaStored => ({
  enabled: true,
  plan: planOf(4, 3),
  state: startPlan(1, day(0)),
  startedOn: day(0),
  offSince: null,
  ...extra,
});

async function repo() {
  const db = await createUserDb();
  let t = 1_000;
  return { db, repo: new AdwamuhaRepository(db, () => t++) };
}

describe('AdwamuhaRepository — the plan and state', () => {
  it('has nothing before the feature is turned on', async () => {
    expect(await (await repo()).repo.load()).toBeNull();
  });

  it("saves and loads the user's own plan and where they are", async () => {
    const { repo: r } = await repo();
    await r.save(stored());
    expect(await r.load()).toEqual(stored());
    await r.save(stored({ enabled: false, offSince: day(5) }));
    expect(await r.load()).toMatchObject({ enabled: false, offSince: day(5) });
  });

  it('treats damaged data as never turned on (no crash)', async () => {
    const { db, repo: r } = await repo();
    await r.save(stored());
    await db.run('UPDATE AdwamuhaState SET StateJson = \'{"step": 99}\'');
    expect(await r.load()).toBeNull();
    await db.run("UPDATE AdwamuhaState SET PlanJson = 'not json'");
    expect(await r.load()).toBeNull();
  });
});

describe('AdwamuhaRepository — day records', () => {
  it('keeps one record per date and session: the first one', async () => {
    const { repo: r } = await repo();
    expect(await r.addRecord(rec(day(1), 'morning', { completedAt: 5, late: true }))).toBe(true);
    expect(await r.addRecord(rec(day(1), 'morning', { completedAt: 9 }))).toBe(false);
    expect(await r.addRecord(rec(day(1), 'evening'))).toBe(true);
    expect(await r.listRecords()).toEqual([
      rec(day(1), 'evening'),
      rec(day(1), 'morning', { completedAt: 5, late: true }),
    ]);
  });

  it('undoes «قرأتُها من حفظي», never a ward read in the app', async () => {
    const { repo: r } = await repo();
    await r.addRecord(rec(day(1), 'morning', { source: 'manual' }));
    await r.addRecord(rec(day(1), 'evening'));
    expect(await r.removeManualRecord(day(1), 'evening')).toBe(false);
    expect(await r.removeManualRecord(day(1), 'morning')).toBe(true);
    expect((await r.listRecords()).map((x) => x.session)).toEqual(['evening']);
  });
});

describe('AdwamuhaRepository — pauses, history, shown messages', () => {
  it('adds, changes and removes pauses', async () => {
    const { repo: r } = await repo();
    const id = await r.addPause({ from: day(10), to: day(16), kind: 'break' });
    await r.addPause({ from: day(2), to: day(3), kind: 'off' });
    await r.updatePause(id, { from: day(10), to: day(11), kind: 'break' });
    expect(await r.listPauses()).toEqual([
      { id: expect.any(Number), from: day(2), to: day(3), kind: 'off' },
      { id, from: day(10), to: day(11), kind: 'break' },
    ]);
    await r.updatePause(id, null);
    expect(await r.listPauses()).toHaveLength(1);
  });

  it('keeps the history in order', async () => {
    const { repo: r } = await repo();
    await r.logEvent(day(0), 'start', 1, { startStep: 1 });
    await r.logEvent(day(28), 'advance', 2);
    expect(await r.listEvents()).toEqual([
      { id: 1, at: 1000, day: day(0), kind: 'start', step: 1, data: { startStep: 1 } },
      { id: 2, at: 1001, day: day(28), kind: 'advance', step: 2, data: null },
    ]);
  });

  it('shows each message once', async () => {
    const { repo: r } = await repo();
    expect(await r.wasShown('tip:1')).toBe(false);
    expect(await r.markShown('tip:1')).toBe(true);
    expect(await r.markShown('tip:1')).toBe(false);
    expect(await r.wasShown('tip:1')).toBe(true);
  });
});
