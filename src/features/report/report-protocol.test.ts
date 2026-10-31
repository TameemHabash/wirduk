import { REPORT_LIMITS, base64Bytes, parseReport } from './report-protocol';

const JPEG = '/9j/4AAQSkZJRg==';
const PNG = 'iVBORw0KGgoAAAANSUhEUg==';
const TEXT = 'العداد لا يتحرك بعد الضغط';

describe('parseReport', () => {
  it('accepts a report and trims the description', () => {
    expect(
      parseReport({
        description: `  ${TEXT}\n`,
        details: { appVersion: '1.0.0', os: 'Android 14' },
        images: [
          { type: 'image/jpeg', data: JPEG },
          { type: 'image/png', data: PNG },
        ],
      }),
    ).toEqual({
      description: TEXT,
      details: { appVersion: '1.0.0', os: 'Android 14' },
      images: [
        { type: 'image/jpeg', data: JPEG },
        { type: 'image/png', data: PNG },
      ],
    });
  });

  it('accepts the screen, phone text size and free storage details', () => {
    const details = {
      screen: '1080×2400 px (412×915 dp)',
      fontScale: '115%',
      freeStorage: '12.3 GB',
    };
    expect(parseReport({ description: TEXT, details })).toMatchObject({ details });
  });

  it('details and images are optional', () => {
    expect(parseReport({ description: TEXT })).toEqual({
      description: TEXT,
      details: {},
      images: [],
    });
  });

  it('refuses a description that is too short or too long', () => {
    expect(parseReport({ description: '   قصير   ' })).toEqual({ error: 'invalid' });
    expect(parseReport({ description: 'a'.repeat(REPORT_LIMITS.maxChars + 1) })).toEqual({
      error: 'too-big',
    });
    expect(parseReport({ description: 42 })).toEqual({ error: 'invalid' });
    expect(parseReport(null)).toEqual({ error: 'invalid' });
    expect(parseReport([TEXT])).toEqual({ error: 'invalid' });
  });

  it('refuses unknown or long details', () => {
    expect(parseReport({ description: TEXT, details: { email: 'x' } })).toEqual({
      error: 'invalid',
    });
    expect(parseReport({ description: TEXT, details: { device: 'x'.repeat(101) } })).toEqual({
      error: 'invalid',
    });
    expect(parseReport({ description: TEXT, details: { os: 14 } })).toEqual({ error: 'invalid' });
  });

  it('refuses files that are not JPEG or PNG images', () => {
    const bad = [
      { type: 'image/gif', data: JPEG },
      { type: 'image/png', data: JPEG }, // the type does not match the bytes
      { type: 'image/jpeg', data: 'PHN2Zz4=' }, // <svg>
      { type: 'image/jpeg', data: '/9j/<script>' },
      { type: 'image/jpeg' },
      'image',
    ];
    for (const image of bad) {
      expect(parseReport({ description: TEXT, images: [image] })).toEqual({ error: 'invalid' });
    }
  });

  it('refuses too many or too large images', () => {
    const one = { type: 'image/jpeg', data: JPEG };
    expect(
      parseReport({ description: TEXT, images: Array(REPORT_LIMITS.maxImages + 1).fill(one) }),
    ).toEqual({ error: 'too-big' });
    const big = { type: 'image/jpeg', data: `/9j/${'A'.repeat(1_400_000)}` };
    expect(parseReport({ description: TEXT, images: [big] })).toEqual({ error: 'too-big' });
  });
});

describe('base64Bytes', () => {
  it('counts the decoded bytes', () => {
    expect(base64Bytes('AAAA')).toBe(3);
    expect(base64Bytes('AAA=')).toBe(2);
    expect(base64Bytes('AA==')).toBe(1);
  });
});
