import { Linking } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import type { AdwamuhaMessage } from '@/data/models/index';
import { renderWithApp } from '@/test-utils/render-app';

import { LibraryMessageView } from './LibraryMessageView';

const hadith: AdwamuhaMessage = {
  id: 'h-test',
  kind: 'hadith',
  moments: [],
  texts: ['نص الحديث للاختبار'],
  verse: null,
  hadith: {
    rawi: 'راوٍ',
    muhaddith: 'محدّث',
    book: 'كتاب',
    number: '12',
    grading: 'صحيح',
    dorarUrl: 'https://dorar.net/hadith/sharh/12',
  },
};

const verse: AdwamuhaMessage = {
  id: 'v-test',
  kind: 'verse',
  moments: [],
  texts: ['نص آية للاختبار'],
  verse: { sura: 2, suraName: 'البقرة', from: 5, to: 5 },
  hadith: null,
};

describe('a message after a ward (redesign)', () => {
  it('a hadith shows its text; its Dorar data folds under «المصدر» (owner, 2026-11-26)', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await renderWithApp(<LibraryMessageView message={hadith} />);
    expect(screen.getByText('نص الحديث للاختبار')).toBeOnTheScreen();
    expect(screen.queryByText(/راوٍ/)).toBeNull();
    const fold = screen.getByRole('button', { name: 'المصدر' });
    await fireEvent(fold, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(screen.getByText(/راوٍ/)).toBeOnTheScreen();
    expect(screen.getByText(/صحيح/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('link'));
    expect(open).toHaveBeenCalledWith('https://dorar.net/hadith/sharh/12');
    open.mockRestore();
  });

  it('a verse stays as it is: its surah and verse under it, nothing folded', async () => {
    await renderWithApp(<LibraryMessageView message={verse} />);
    expect(screen.getByText(/البقرة/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'المصدر' })).toBeNull();
  });
});
