import { useState } from 'react';
import { Linking } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import { Button } from '@/components/ui/Button';
import type { Dhikr } from '@/data/models/index';
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

describe('DhikrPage — fadl and source', () => {
  it('the fadl with no label and no box; the source folded under «المصدر», opened by a tap', async () => {
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
    // Option «ب» (owner, 2026-11-26): the text alone (a screen reader still hears «الفضل:»).
    expect(screen.getByText('حطت خطاياه')).toBeOnTheScreen();
    expect(screen.queryByText(/^الفضل:/)).toBeNull();
    expect(screen.getByLabelText('الفضل: حطت خطاياه')).toBeOnTheScreen();
    // Folded until «المصدر» is tapped.
    expect(screen.queryByText(/^المصدر:/)).toBeNull();
    const fold = screen.getByRole('button', { name: 'المصدر' });
    expect(fold.props.accessibilityState).toMatchObject({ expanded: false });
    await fireEvent(fold, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(screen.getByText('المصدر: صحيح البخاري (6405) — الراوي: أبو هريرة')).toBeOnTheScreen();
    expect(screen.getByText('الحكم: صحيح — البخاري')).toBeOnTheScreen();
    const link = screen.getByRole('link', { name: 'عرض في الدرر السنية' });
    await fireEvent(link, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(open).toHaveBeenCalledWith('https://dorar.net/hadith/sharh/123');
    open.mockRestore();
  });

  it('shows nothing extra when there is no source', async () => {
    await renderWithApp(<DhikrPage dhikr={dhikr(null)} />);
    expect(screen.queryByRole('button', { name: 'المصدر' })).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('a fadl with no source: only the fadl, no «المصدر»', async () => {
    await renderWithApp(
      <DhikrPage
        dhikr={dhikr({ fadl: 'حطت خطاياه', source: null, grading: null, dorarUrl: null })}
      />,
    );
    expect(screen.getByText('حطت خطاياه')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'المصدر' })).toBeNull();
  });

  it('folds again when the page is no longer on screen', async () => {
    const d = dhikr({ fadl: null, source: 'مصدر', grading: null, dorarUrl: null });
    function Host() {
      const [current, setCurrent] = useState(true);
      return (
        <>
          <Button title="next" onPress={() => setCurrent(false)} />
          <DhikrPage dhikr={d} current={current} />
        </>
      );
    }
    await renderWithApp(<Host />);
    await fireEvent(screen.getByRole('button', { name: 'المصدر' }), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(screen.getByText('المصدر: مصدر')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('next'));
    expect(screen.queryByText('المصدر: مصدر')).toBeNull();
  });

  it('a long text: the bottom edge fades only while more text is below', async () => {
    await renderWithApp(<DhikrPage dhikr={dhikr(null)} />);
    expect(screen.queryByTestId('bottom-fade')).toBeNull();
    const scroll = screen.getByTestId('dhikr-scroll');
    await fireEvent(screen.getByTestId('dhikr-page'), 'layout', {
      nativeEvent: { layout: { height: 400 } },
    });
    await fireEvent(scroll, 'contentSizeChange', 360, 1000);
    expect(screen.getByTestId('bottom-fade')).toBeOnTheScreen();
    await fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { y: 600 } } });
    expect(screen.queryByTestId('bottom-fade')).toBeNull();
    await fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { y: 300 } } });
    expect(screen.getByTestId('bottom-fade')).toBeOnTheScreen();
  });
});
