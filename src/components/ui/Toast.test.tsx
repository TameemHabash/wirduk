import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppThemeProvider } from '@/theme/ThemeProvider';

import { Button } from './Button';
import { TOAST_DURATION_MS, ToastProvider, useToast, type ToastOptions } from './Toast';
import { tr } from '@/test-utils/tr';

function Shower({ options }: { options: ToastOptions }) {
  const toast = useToast();
  return <Button title="أظهر" onPress={() => toast.show(options)} />;
}

async function show(options: ToastOptions) {
  await render(
    <SafeAreaProvider>
      <AppThemeProvider>
        <ToastProvider>
          <Shower options={options} />
        </ToastProvider>
      </AppThemeProvider>
    </SafeAreaProvider>,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'أظهر' }));
}

describe('Toast', () => {
  afterEach(() => jest.useRealTimers());

  it('shows its message, then goes away by itself', async () => {
    jest.useFakeTimers();
    await show({ message: tr('adwamuha.plan.saved'), icon: 'check', tone: 'gold' });
    expect(screen.getByText(tr('adwamuha.plan.saved'))).toBeOnTheScreen();
    // Not a button: nothing to press.
    expect(screen.queryByRole('button', { name: tr('adwamuha.plan.saved') })).toBeNull();
    await act(async () => jest.advanceTimersByTime(TOAST_DURATION_MS + 10));
    expect(screen.queryByText(tr('adwamuha.plan.saved'))).toBeNull();
  });

  it('with an action it is a button: a tap closes it and runs the action', async () => {
    const open = jest.fn();
    await show({ message: 'افتح الدرر', icon: 'external', onPress: open });
    await fireEvent.press(screen.getByRole('button', { name: 'افتح الدرر' }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('افتح الدرر')).toBeNull();
  });
});
