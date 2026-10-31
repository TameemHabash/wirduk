import { buildFtsQuery, queryWords } from './fts-query';

describe('queryWords', () => {
  it('normalizes like the stored search text', () => {
    expect(queryWords('سُبْحَانَ اللَّهِ')).toEqual(['سبحان', 'الله']);
    expect(queryWords('الإسلام')).toEqual(['الاسلام']);
  });

  it('drops one-letter words when there are longer ones', () => {
    expect(queryWords('و الله')).toEqual(['الله']);
  });

  it('keeps a single short word when it is all there is', () => {
    expect(queryWords('ب')).toEqual(['ب']);
  });

  it('returns nothing for empty or punctuation-only input', () => {
    expect(queryWords('')).toEqual([]);
    expect(queryWords(' (( )) * " ')).toEqual([]);
  });
});

describe('buildFtsQuery', () => {
  it('builds quoted prefix terms that must all match', () => {
    expect(buildFtsQuery('سبحان الله')).toBe('"سبحان"* "الله"*');
  });

  it('strips FTS syntax characters from the input', () => {
    expect(buildFtsQuery('سبحان" OR "*')).toBe('"سبحان"* "or"*');
    expect(buildFtsQuery('NEAR(a b)')).toBe('"near"*');
  });

  it('returns null when there is nothing to search for', () => {
    expect(buildFtsQuery('')).toBeNull();
    expect(buildFtsQuery('***')).toBeNull();
  });
});
