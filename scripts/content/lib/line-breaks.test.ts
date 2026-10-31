import { addLineBreaks } from './line-breaks';

describe('addLineBreaks', () => {
  it('puts each surah on its own line', () => {
    const text =
      'بسم الله الرحمن الرحيم ﴿قُلْ هُوَ﴾.  بسم الله الرحمن الرحيم ﴿قُلْ أَعُوذُ﴾، بسم الله الرحمن الرحيم ﴿النَّاسِ﴾';
    expect(addLineBreaks(text)).toBe(
      'بسم الله الرحمن الرحيم ﴿قُلْ هُوَ﴾.\nبسم الله الرحمن الرحيم ﴿قُلْ أَعُوذُ﴾،\nبسم الله الرحمن الرحيم ﴿النَّاسِ﴾',
    );
  });

  it("breaks after an introduction, after the isti'adha, and before the next step", () => {
    expect(
      addLineBreaks('فَيَقْرَأُ فِيهِمَا:بسم الله الرحمن الرحيم ﴿أَحَدٌ﴾ ثُمَّ يَمْسَحُ'),
    ).toBe('فَيَقْرَأُ فِيهِمَا:\nبسم الله الرحمن الرحيم ﴿أَحَدٌ﴾\nثُمَّ يَمْسَحُ');
    expect(
      addLineBreaks('أَعُوذُ بِاللَّهِ مِنَ الشَّيطَانِ الرَّجِيمِ ﴿اللَّهُ لاَ إِلَهَ﴾.'),
    ).toBe('أَعُوذُ بِاللَّهِ مِنَ الشَّيطَانِ الرَّجِيمِ\n﴿اللَّهُ لاَ إِلَهَ﴾.');
  });

  it('splits a step list only when asked; side-note dashes stay', () => {
    const steps = '[ (يَنْفُثُ) - (يَسْتَعِيذُ) - لاَ يُحَدِّثْ ]';
    expect(addLineBreaks(steps, { stepList: true })).toBe(
      '[ (يَنْفُثُ)\n- (يَسْتَعِيذُ)\n- لاَ يُحَدِّثْ ]',
    );
    const aside = 'أَنَّ هَذَا الأمْرَ - وَيُسَمِّي حَاجَتَهُ - خَيْرٌ لِي';
    expect(addLineBreaks(aside)).toBe(aside);
  });

  it('finds the words whatever the order of their marks', () => {
    // Shadda then fatha, and fatha then shadda: both orders are in the book.
    const shaddaFirst = `الرَّجِيمِ ﴿`;
    const fathaFirst = `الرَّجِيمِ ﴿`;
    for (const t of [shaddaFirst, fathaFirst]) expect(addLineBreaks(`${t}آية﴾`)).toContain('\n﴿');
    expect(addLineBreaks(`﴾ ثُمَّ يَمْسَحُ`)).toContain('﴾\n');
    expect(addLineBreaks(`﴾ ثُمَّ يَمْسَحُ`)).toContain('﴾\n');
    // A longer word that starts like "ثم" is not the next step.
    expect(addLineBreaks('﴾ ثمرات')).toBe('﴾ ثمرات');
  });

  it('changes nothing else', () => {
    const plain = 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ (مائة مرَّةٍ).';
    expect(addLineBreaks(plain)).toBe(plain);
    expect(addLineBreaks('بسم الله الرحمن الرحيم ﴿قُلْ﴾')).toBe('بسم الله الرحمن الرحيم ﴿قُلْ﴾');
  });
});
