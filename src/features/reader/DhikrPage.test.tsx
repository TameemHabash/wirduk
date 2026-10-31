import { Linking } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import type { Dhikr } from '@/data/models';
import { renderWithApp } from '@/test-utils/render-app';

import { DhikrPage } from './DhikrPage';

const dhikr = (source: Dhikr['source']): Dhikr => ({
  id: 1017,
  categoryId: 1,
  order: 17,
  count: 100,
  text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
  audioFile: null,
  audioRepeats: 1,
  source,
  custom: false,
});

describe('DhikrPage — source from Dorar', () => {
  it('shows the fadl, source and grading, and opens the hadith on Dorar', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await renderWithApp(
      <DhikrPage
        dhikr={dhikr({
          fadl: 'حطت خطاياه',
          source: 'صحيح البخاري (6405) — الراوي: أبو هريرة',
          grading: 'صحيح — البخاري',
          dorarUrl: 'https://dorar.net/hadith/sharh/123',
        })}
      />,
    );
    expect(screen.getByText('الفضل: حطت خطاياه')).toBeOnTheScreen();
    expect(screen.getByText('المصدر: صحيح البخاري (6405) — الراوي: أبو هريرة')).toBeOnTheScreen();
    expect(screen.getByText('الحكم: صحيح — البخاري')).toBeOnTheScreen();
    const link = screen.getByRole('link', { name: 'عرض في الدرر السنية' });
    await fireEvent(link, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(open).toHaveBeenCalledWith('https://dorar.net/hadith/sharh/123');
    open.mockRestore();
  });

  it('shows nothing extra when there is no source', async () => {
    await renderWithApp(<DhikrPage dhikr={dhikr(null)} />);
    expect(screen.queryByText(/^المصدر:/)).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
