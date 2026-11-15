import { type WardCounts, latestWriter } from './ward-progress';

describe('latestWriter (the day’s ward read in parts)', () => {
  it('writes one at a time, in order, and only the newest of the ones that waited', async () => {
    const written: (WardCounts | null)[] = [];
    let release: () => void = () => undefined;
    const keep = latestWriter(
      (counts) =>
        new Promise<void>((resolve) => {
          written.push(counts);
          release = resolve;
        }),
    );
    keep({ 1: 1 }); // written at once
    keep({ 1: 2 }); // waits…
    keep({ 1: 3 }); // …and takes the place of the one before
    keep(null); // finished: clears, after the rest
    expect(written).toEqual([{ 1: 1 }]);
    release();
    await new Promise((r) => setImmediate(r));
    expect(written).toEqual([{ 1: 1 }, null]);
    release();
    await new Promise((r) => setImmediate(r));
    keep({ 2: 1 }); // a new write after a quiet time goes at once
    expect(written).toEqual([{ 1: 1 }, null, { 2: 1 }]);
  });

  it('a failed write does not stop the next ones', async () => {
    const written: (WardCounts | null)[] = [];
    let fail = true;
    const keep = latestWriter(async (counts) => {
      written.push(counts);
      if (fail) {
        fail = false;
        throw new Error('disk full');
      }
    });
    keep({ 1: 1 });
    await new Promise((r) => setImmediate(r));
    keep({ 1: 2 });
    await new Promise((r) => setImmediate(r));
    expect(written).toEqual([{ 1: 1 }, { 1: 2 }]);
  });
});
