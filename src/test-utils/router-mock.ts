/**
 * Test-only stand-in for expo-router (wired in jest.setup.ui.ts).
 * Tests set `routeParams` and read the calls on `mockRouter`.
 */
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  dismissTo: jest.fn(),
  navigate: jest.fn(),
};

/** Navigation object for "leave with unsaved changes?" guards. */
export const mockNavigation = {
  addListener: jest.fn(() => () => undefined),
  dispatch: jest.fn(),
};

let params: Record<string, string> = {};

export function setRouteParams(next: Record<string, string>): void {
  params = next;
}

export function getRouteParams(): Record<string, string> {
  return params;
}

export function resetRouterMock(): void {
  params = {};
  for (const fn of Object.values(mockRouter)) fn.mockReset();
  mockNavigation.addListener.mockImplementation(() => () => undefined);
  mockNavigation.dispatch.mockReset();
}
