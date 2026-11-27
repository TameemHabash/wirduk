import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { COLORS } from '@/theme/colors';
import { AppThemeProvider } from '@/theme/ThemeProvider';

import { AppText } from './AppText';
import { Button } from './Button';
import { TextButton } from './TextButton';
import { tr } from '@/test-utils/tr';

async function renderButton(props: Partial<Parameters<typeof Button>[0]> = {}) {
  const onPress = jest.fn();
  await render(
    <AppThemeProvider initialPreference="light">
      <Button title="إضافة صور" onPress={onPress} {...props} />
    </AppThemeProvider>,
  );
  return onPress;
}

const flat = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;

describe('Button', () => {
  it('shows its title and calls onPress', async () => {
    const onPress = await renderButton();
    await fireEvent.press(screen.getByRole('button', { name: tr('report.addScreenshots') }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does nothing when disabled', async () => {
    const onPress = await renderButton({ disabled: true });
    expect(screen.getByRole('button', { name: tr('report.addScreenshots') })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: tr('report.addScreenshots') }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('lets the title use the whole button width (no wrap from a short measure, reports#2)', async () => {
    await renderButton();
    expect(flat(screen.getByText(tr('report.addScreenshots')))).toMatchObject({
      alignSelf: 'stretch',
      textAlign: 'center',
    });
  });

  it.each([
    ['primary', COLORS.light.primary, COLORS.light.onPrimary],
    ['secondary', COLORS.light.surface, COLORS.light.text],
    ['soft', COLORS.light.primarySoft, COLORS.light.primaryInk],
    ['danger', COLORS.light.danger, COLORS.light.onDanger],
    ['plain', 'transparent', COLORS.light.textMuted],
  ] as const)('a %s button has its own fill and text color', async (kind, fill, text) => {
    await renderButton({ kind });
    expect(
      flat(screen.getByRole('button', { name: tr('report.addScreenshots') })).backgroundColor,
    ).toBe(fill);
    expect(flat(screen.getByText(tr('report.addScreenshots'))).color).toBe(text);
  });

  it('a small one is 40 high and only as wide as its title (with room)', async () => {
    await renderButton({ size: 'small' });
    expect(flat(screen.getByRole('button', { name: tr('report.addScreenshots') }))).toMatchObject({
      minHeight: 40,
      alignSelf: 'flex-start',
    });
  });
});

describe('TextButton', () => {
  it('is a button with its title; a delete is red', async () => {
    const onPress = jest.fn();
    await render(
      <AppThemeProvider initialPreference="light">
        <TextButton title="حذف الباب" icon="trash" tone="danger" onPress={onPress} />
      </AppThemeProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: tr('custom.deleteCategory') }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(flat(screen.getByText(tr('custom.deleteCategory'))).color).toBe(COLORS.light.danger);
  });
});

describe('AppText roomy', () => {
  it('becomes a few dp wider than Android measured it, once (Galaxy, reports#2)', async () => {
    await render(
      <AppThemeProvider>
        <AppText roomy>غير مفعّلة</AppText>
      </AppThemeProvider>,
    );
    const text = () => screen.getByText(tr('adwamuha.settings.off'));
    expect(flat(text()).minWidth).toBeUndefined();
    await fireEvent(text(), 'layout', { nativeEvent: { layout: { width: 80.4, height: 20 } } });
    expect(flat(text()).minWidth).toBe(87);
    // Its own new width does not make it grow again.
    await fireEvent(text(), 'layout', { nativeEvent: { layout: { width: 87, height: 20 } } });
    expect(flat(text()).minWidth).toBe(87);
  });
});
