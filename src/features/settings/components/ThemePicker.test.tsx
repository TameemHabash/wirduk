import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppThemeProvider } from '@/theme/ThemeProvider';

import { ThemePicker } from './ThemePicker';

describe('ThemePicker', () => {
  it('shows the three options with the saved one selected', async () => {
    await render(
      <AppThemeProvider initialPreference="dark">
        <ThemePicker />
      </AppThemeProvider>,
    );
    expect(screen.getByRole('radio', { name: 'حسب النظام' })).not.toBeSelected();
    expect(screen.getByRole('radio', { name: 'فاتح' })).not.toBeSelected();
    expect(screen.getByRole('radio', { name: 'داكن' })).toBeSelected();
  });

  it('selects an option and reports the change', async () => {
    const onChange = jest.fn();
    await render(
      <AppThemeProvider initialPreference="system" onPreferenceChange={onChange}>
        <ThemePicker />
      </AppThemeProvider>,
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'فاتح' }));
    expect(screen.getByRole('radio', { name: 'فاتح' })).toBeSelected();
    expect(onChange).toHaveBeenCalledWith('light');
  });
});
