/**
 * Test-only: the app going to the background and back, as Android reports it.
 * (In the ui setup `AppState.addEventListener` is already a mock: its own behavior is put
 * back after the test; `mockRestore` would leave it returning undefined. CLAUDE.md, "Tests".)
 */
import { AppState, type AppStateStatus } from 'react-native';
import { act } from '@testing-library/react-native';

/** Catches the app's AppState listeners; `send('background')` then tells them. */
export function captureAppState() {
  const listeners: ((s: AppStateStatus) => void)[] = [];
  const spy = jest.spyOn(AppState, 'addEventListener');
  const original = spy.getMockImplementation();
  spy.mockImplementation((_type, listener) => {
    listeners.push(listener as (s: AppStateStatus) => void);
    return { remove: jest.fn() } as never;
  });
  return {
    send: async (s: AppStateStatus) => act(async () => listeners.forEach((l) => l(s))),
    restore: () => (original ? spy.mockImplementation(original) : spy.mockRestore()),
  };
}

/** The app is in the background (screen off) until `restore()`: JS timers would wait. */
export function screenOff() {
  const own = Object.getOwnPropertyDescriptor(AppState, 'currentState');
  Object.defineProperty(AppState, 'currentState', {
    value: 'background',
    configurable: true,
    writable: true,
  });
  return {
    restore: () => {
      if (own) Object.defineProperty(AppState, 'currentState', own);
      else delete (AppState as { currentState?: unknown }).currentState;
    },
  };
}
