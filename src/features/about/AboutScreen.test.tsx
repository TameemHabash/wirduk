import { screen } from '@testing-library/react-native';

import { APP_CONFIG } from '@/config/app-config';
import { renderWithApp } from '@/test-utils/render-app';

import { AboutScreen } from './AboutScreen';

describe('AboutScreen', () => {
  it('names the content, the sources, the audio and the fonts', async () => {
    await renderWithApp(<AboutScreen />);
    expect(await screen.findByText(/حصن المسلم/)).toBeOnTheScreen();
    expect(screen.getByText('مصادر الأحاديث وفضلها من موقع الدرر السنية.')).toBeOnTheScreen();
    expect(screen.getByText(/حمد الدريهم/)).toBeOnTheScreen();
    expect(screen.getByText(/SIL Open Font License/)).toBeOnTheScreen();
  });

  it('shows the content version', async () => {
    await renderWithApp(<AboutScreen />);
    expect(
      await screen.findByText(new RegExp(`المحتوى ${APP_CONFIG.content.version}$`)),
    ).toBeOnTheScreen();
  });
});
