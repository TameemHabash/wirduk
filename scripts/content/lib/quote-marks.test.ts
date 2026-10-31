import { removeDoubleParens } from './quote-marks';

describe('removeDoubleParens', () => {
  it('removes the (( )) around quoted words and keeps single notes', () => {
    expect(removeDoubleParens('((سُبْحَانَ اللَّهِ)) (ثلاث مرات).')).toBe(
      'سُبْحَانَ اللَّهِ (ثلاث مرات).',
    );
    expect(removeDoubleParens('يَقُولُ: ((وَأَنَا أَشْهَدُ))')).toBe('يَقُولُ: وَأَنَا أَشْهَدُ');
  });

  it('keeps two notes that happen to close together', () => {
    const text = '(يَنْفُثُ عَنْ يَسَارِهِ (ثلاثاً)) - ((لاَ يُحَدِّثْ بِهَا أَحَداً))';
    expect(removeDoubleParens(text)).toBe(
      '(يَنْفُثُ عَنْ يَسَارِهِ (ثلاثاً)) - لاَ يُحَدِّثْ بِهَا أَحَداً',
    );
  });

  it('removes nested quotes and a half that lost its partner', () => {
    expect(removeDoubleParens('((يَقُولُ: ((آمَنْتُ بِاللَّهِ)).')).toBe(
      'يَقُولُ: آمَنْتُ بِاللَّهِ.',
    );
    expect(removeDoubleParens('حُطَّتْ خَطَايَاهُ)).')).toBe('حُطَّتْ خَطَايَاهُ.');
  });

  it('tidies only the spaces it leaves behind', () => {
    expect(removeDoubleParens('قال: (( سبحان الله ))  .')).toBe('قال: سبحان الله .');
    expect(removeDoubleParens('مَا فِي  هَذَا')).toBe('مَا فِي  هَذَا');
  });
});
