import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppThemeProvider } from '@/theme/ThemeProvider';

import { Button } from './Button';

async function renderButton(props: Partial<Parameters<typeof Button>[0]> = {}) {
  const onPress = jest.fn();
  await render(
    <AppThemeProvider>
      <Button title="إضافة صور" onPress={onPress} {...props} />
    </AppThemeProvider>,
  );
  return onPress;
}

describe('Button', () => {
  it('shows its title and calls onPress', async () => {
    const onPress = await renderButton();
    await fireEvent.press(screen.getByRole('button', { name: 'إضافة صور' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does nothing when disabled', async () => {
    const onPress = await renderButton({ disabled: true });
    expect(screen.getByRole('button', { name: 'إضافة صور' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'إضافة صور' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('lets the title use the whole button width (no wrap from a short measure, reports#2)', async () => {
    await renderButton();
    const style = StyleSheet.flatten(screen.getByText('إضافة صور').props.style);
    expect(style).toMatchObject({ alignSelf: 'stretch', textAlign: 'center' });
  });
});
