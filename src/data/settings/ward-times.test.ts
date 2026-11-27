import { DEFAULT_WARD_TIMES } from '@/data/models';

import { validWardTimes } from './ward-times';

describe('validWardTimes', () => {
  it('accepts the defaults and refuses times out of order', () => {
    expect(validWardTimes(DEFAULT_WARD_TIMES)).toBe(true);
    expect(validWardTimes({ ...DEFAULT_WARD_TIMES, morningOnTimeEnd: '03:00' })).toBe(false);
    expect(validWardTimes({ ...DEFAULT_WARD_TIMES, eveningStart: '11:00' })).toBe(false);
    // The evening's on-time end after the next morning starts.
    expect(validWardTimes({ ...DEFAULT_WARD_TIMES, eveningOnTimeEnd: '05:00' })).toBe(false);
    expect(validWardTimes({ ...DEFAULT_WARD_TIMES, morningStart: '4:00' })).toBe(false);
  });
});
