import { cleanDisplayText, hasTashkeel, toSearchText } from './normalize';

/** Builds a string from code points, so invisible characters stay readable here. */
const cp = (...codePoints: number[]) => String.fromCodePoint(...codePoints);

// Presentation forms seen in real source titles.
const TEH_INITIAL = cp(0xfe97); // ﺗ
const HEH_MEDIAL = cp(0xfeec); // ﻬ
const LAM_INITIAL = cp(0xfedf); // ﻟ
const MEEM_MEDIAL = cp(0xfee4); // ﻤ
const JEEM_MEDIAL = cp(0xfea0); // ﺠ
const QURAN_OPEN = cp(0xfd3f); // ﴿
const QURAN_CLOSE = cp(0xfd3e); // ﴾
const SALAWAT = cp(0xfdfa); // ﷺ
const BOM = cp(0xfeff); // invisible

describe('cleanDisplayText', () => {
  it('replaces PDF letter-shape artifacts with normal letters', () => {
    expect(cleanDisplayText(`${TEH_INITIAL}${HEH_MEDIAL}نئة المولود`)).toBe('تهنئة المولود');
    expect(cleanDisplayText(`ما يقال في ا${LAM_INITIAL}${MEEM_MEDIAL}${JEEM_MEDIAL}لس`)).toBe(
      'ما يقال في المجلس',
    );
  });

  it('keeps tashkeel exactly as it is', () => {
    const text = 'أَعُوذُ بِاللَّهِ مِنَ الشَّيطَانِ الرَّجِيمِ';
    expect(cleanDisplayText(text)).toBe(text);
  });

  it('keeps Quran brackets and word ligatures', () => {
    const text = `${QURAN_OPEN}قُلْ هُوَ اللَّهُ أَحَدٌ${QURAN_CLOSE} ${SALAWAT}`;
    expect(cleanDisplayText(text)).toBe(text);
  });

  it('removes the invisible BOM character', () => {
    expect(cleanDisplayText(`${BOM}سبحان الله`)).toBe('سبحان الله');
  });

  it('returns plain text unchanged', () => {
    expect(cleanDisplayText('')).toBe('');
    expect(cleanDisplayText('abc 123')).toBe('abc 123');
  });
});

describe('toSearchText', () => {
  it('removes tashkeel, shadda, sukun and tanween', () => {
    expect(toSearchText('سُبْحَانَ اللَّهِ وَبِحَمْدِهِ')).toBe('سبحان الله وبحمده');
    expect(toSearchText('أَحَدٌ')).toBe('احد');
  });

  it('removes tatweel and the dagger alef', () => {
    expect(toSearchText('اللَّهُـمَّ')).toBe('اللهم');
    expect(toSearchText('الرَّحْمَٰنِ')).toBe('الرحمن');
  });

  it('folds alef forms to a bare alef', () => {
    expect(toSearchText('أ إ آ ٱ ا')).toBe('ا ا ا ا ا');
  });

  it('folds taa marbuta, alef maqsura, and hamza seats', () => {
    expect(toSearchText('رحمة')).toBe('رحمه');
    expect(toSearchText('على')).toBe('علي');
    expect(toSearchText('شيء مؤمن سائل')).toBe('شيء مومن سايل');
  });

  it('removes punctuation and Quran brackets, and collapses spaces', () => {
    expect(toSearchText('((حَسْبِيَ اللَّهُ)) (سَبْعَ مَرّاتٍ).')).toBe('حسبي الله سبع مرات');
    expect(
      toSearchText(`${QURAN_OPEN}قُلْ هُوَ اللَّهُ أَحَدٌ* اللَّهُ الصَّمَدُ${QURAN_CLOSE}`),
    ).toBe('قل هو الله احد الله الصمد');
    expect(toSearchText('  أ ،  ب ؛ ج  ')).toBe('ا ب ج');
  });

  it('turns presentation forms and ligatures into searchable words', () => {
    expect(toSearchText(`${TEH_INITIAL}${HEH_MEDIAL}نئة`)).toBe('تهنيه');
    expect(toSearchText(`محمد ${SALAWAT}`)).toBe('محمد صلي الله عليه وسلم');
  });

  it('gives the same result for the same words with or without tashkeel', () => {
    const withMarks = 'رَضِيتُ بِاللَّهِ رَبَّاً، وَبِالْإِسْلاَمِ دِيناً';
    const typed = 'رضيت بالله ربا وبالاسلام دينا';
    expect(toSearchText(withMarks)).toBe(toSearchText(typed));
  });

  it('lowercases Latin text for future languages', () => {
    expect(toSearchText('Glory Be To ALLAH!')).toBe('glory be to allah');
  });

  it('returns an empty string for text with no words', () => {
    expect(toSearchText('')).toBe('');
    expect(toSearchText(' ((  )) . ، ')).toBe('');
  });
});

describe('hasTashkeel', () => {
  it('detects tashkeel', () => {
    expect(hasTashkeel('سُبْحَانَ')).toBe(true);
    expect(hasTashkeel('سبحان')).toBe(false);
  });
});
