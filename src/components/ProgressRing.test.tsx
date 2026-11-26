import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { AppThemeProvider } from '@/theme/ThemeProvider';

import { ProgressRing } from './ProgressRing';

let mockDir: 'rtl' | 'ltr' = 'rtl';
jest.mock('@/i18n/direction', () => ({
  useDirection: () => ({ dir: mockDir, isRtl: mockDir === 'rtl' }),
}));

async function ringTransform() {
  await render(
    <AppThemeProvider>
      <ProgressRing progress={0.25} />
    </AppThemeProvider>,
  );
  return StyleSheet.flatten(screen.getByTestId('progress-ring').props.style).transform;
}

describe('ProgressRing', () => {
  it('starts at the top and fills clockwise in Arabic (owner, 2026-11-25)', async () => {
    mockDir = 'rtl';
    expect(await ringTransform()).toEqual([{ rotate: '-90deg' }]);
  });

  it('fills counterclockwise in a left-to-right language', async () => {
    mockDir = 'ltr';
    expect(await ringTransform()).toEqual([{ rotate: '-90deg' }, { scaleY: -1 }]);
  });
});
