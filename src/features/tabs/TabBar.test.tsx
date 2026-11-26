import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ToastProvider, useToast } from '@/components/Toast';
import { AppThemeProvider } from '@/theme/ThemeProvider';

import { TabBar } from './TabBar';

const routes = ['index', 'adhkar', 'settings'].map((name) => ({
  key: `${name}-1`,
  name,
  params: undefined,
}));

function renderBar(index: number) {
  const navigation = { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() };
  const state = { index, routes } as unknown as BottomTabBarProps['state'];
  function Shower() {
    const toast = useToast();
    return <Button title="أظهر" onPress={() => toast.show({ message: 'رسالة' })} />;
  }
  return {
    navigation,
    view: render(
      <SafeAreaProvider>
        <AppThemeProvider>
          <ToastProvider>
            <Shower />
            <TabBar
              state={state}
              navigation={navigation as unknown as BottomTabBarProps['navigation']}
            />
          </ToastProvider>
        </AppThemeProvider>
      </SafeAreaProvider>,
    ),
  };
}

describe('TabBar', () => {
  it('shows the three tabs (owner, 2026-11-25), the open one selected', async () => {
    const { view } = renderBar(1);
    await view;
    expect(screen.getByRole('tab', { name: 'الرئيسية' })).not.toBeSelected();
    expect(screen.getByRole('tab', { name: 'الأذكار' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'الإعدادات' })).not.toBeSelected();
  });

  it('a tap opens another tab; the open tab stays', async () => {
    const { view, navigation } = renderBar(0);
    await view;
    await fireEvent.press(screen.getByRole('tab', { name: 'الإعدادات' }));
    expect(navigation.navigate).toHaveBeenCalledWith('settings', undefined);
    navigation.navigate.mockClear();
    await fireEvent.press(screen.getByRole('tab', { name: 'الرئيسية' }));
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('lifts the toasts above it', async () => {
    const { view } = renderBar(0);
    await view;
    await fireEvent(screen.getByTestId('tab-bar'), 'layout', {
      nativeEvent: { layout: { width: 384, height: 70 } },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'أظهر' }));
    const style = StyleSheet.flatten(screen.getByTestId('toast-layer').props.style);
    expect(style.paddingBottom).toBe(70 + 12);
  });
});
