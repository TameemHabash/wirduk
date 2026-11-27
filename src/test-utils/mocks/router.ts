/**
 * Test-only stand-in for expo-router (wired in jest.setup.ui.ts).
 * Tests set `routeParams`, read where the app went on `mockRouter`, and leave a
 * screen with `tryToLeave` (its "leave with unsaved changes?" guard runs).
 */
import { act } from '@testing-library/react-native';

export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  dismissTo: jest.fn(),
  navigate: jest.fn(),
  setParams: jest.fn(),
};

type Action = { type: string };
type BeforeRemove = (e: { preventDefault: () => void; data: { action: Action } }) => void;

/** The screens' "beforeRemove" guards (useUnsavedGuard), newest last. */
const guards: BeforeRemove[] = [];

/** Navigation object for "leave with unsaved changes?" guards. */
export const mockNavigation = {
  addListener: jest.fn((event: string, listener: BeforeRemove) => {
    if (event !== 'beforeRemove') return () => undefined;
    guards.push(listener);
    return () => {
      const i = guards.indexOf(listener);
      if (i >= 0) guards.splice(i, 1);
    };
  }),
  /** Leaves for real (after the user chose to discard): `left` lists the actions. */
  dispatch: jest.fn((action: Action) => {
    left.push(action);
  }),
};

/** The navigation actions the app carried out itself (e.g. after «تجاهل»). */
export const left: Action[] = [];

/**
 * The user goes back from the screen. Returns true when the screen let them
 * go at once, false when its guard stopped it (e.g. to ask «تجاهل التغييرات؟»).
 */
export async function tryToLeave(action: Action = { type: 'GO_BACK' }): Promise<boolean> {
  let stopped = false;
  const event = { preventDefault: () => (stopped = true), data: { action } };
  await act(async () => {
    for (const guard of [...guards]) guard(event);
  });
  return !stopped;
}

let params: Record<string, string> = {};

export function setRouteParams(next: Record<string, string>): void {
  params = next;
}

export function getRouteParams(): Record<string, string> {
  return params;
}

export function resetRouterMock(): void {
  params = {};
  guards.length = 0;
  left.length = 0;
  for (const fn of Object.values(mockRouter)) fn.mockReset();
}
