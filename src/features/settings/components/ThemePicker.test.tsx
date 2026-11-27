import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppThemeProvider } from '@/theme/ThemeProvider';

import { ThemePicker } from './ThemePicker';
import { tr } from '@/test-utils/tr';

describe('ThemePicker', () => {
  it('shows the three options with the saved one selected', async () => {
    await render(
      <AppThemeProvider initialPreference="dark">
        <ThemePicker />
      </AppThemeProvider>,
    );
    expect(screen.getByRole('radio', { name: tr('settings.theme.system') })).not.toBeSelected();
    expect(screen.getByRole('radio', { name: tr('settings.theme.light') })).not.toBeSelected();
    expect(screen.getByRole('radio', { name: tr('settings.theme.dark') })).toBeSelected();
  });

  it('selects an option and reports the change', async () => {
    const onChange = jest.fn();
    await render(
      <AppThemeProvider initialPreference="system" onPreferenceChange={onChange}>
        <ThemePicker />
      </AppThemeProvider>,
    );
    await fireEvent.press(screen.getByRole('radio', { name: tr('settings.theme.light') }));
    expect(screen.getByRole('radio', { name: tr('settings.theme.light') })).toBeSelected();
    expect(onChange).toHaveBeenCalledWith('light');
  });
});
