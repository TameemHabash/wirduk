import { AppState, type AppStateStatus, Linking } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { audioFileName } from '@/features/audio/audio-plan';
import { counterStore } from '@/features/counter/counter-store';
import { recitationPlayer } from '@/test-utils/audio-mock';
import { createTestRepositories, renderWithApp } from '@/test-utils/render-app';
import { setRouteParams } from '@/test-utils/router-mock';

import { ReaderScreen } from './ReaderScreen';

const DORAR_TOAST = 'للعرض في الدرر السنية اضغط هنا';
const counter = () => screen.getByLabelText(/^تم \d+ من \d+$/);
const tap = () =>
  fireEvent(counter(), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });

type Repos = Awaited<ReturnType<typeof createTestRepositories>>;

async function open(dhikrId: number, setup?: (repos: Repos) => Promise<void>) {
  const repos = await createTestRepositories();
  await setup?.(repos);
  const categoryId = Math.floor(dhikrId / 1000);
  const adhkar = await repos.content.listAdhkar(categoryId, 'ar');
  counterStore.resetMany(adhkar.map((d) => d.id));
  setRouteParams({ id: String(categoryId), dhikr: String(dhikrId) });
  const view = await renderWithApp(<ReaderScreen />, repos);
  await screen.findByLabelText(/^تم \d+ من \d+$/);
  return { repos, adhkar, view };
}

/** Pretends the app is in the background (screen off) until `restore()`. */
function inBackground() {
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

describe('Reader — "عرض في الدرر السنية"', () => {
  it('counts the tap, and a toast opens Dorar', async () => {
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await open(1017); // سبحان الله وبحمده: 100 times, with a Dorar source
    await act(async () =>
      fireGestureHandler(getByGestureTestId('dorar-link'), [
        { state: State.BEGAN },
        { state: State.ACTIVE },
        { state: State.END },
      ]),
    );
    expect(counter().props.accessibilityLabel).toBe('تم 1 من 100');
    expect(openUrl).not.toHaveBeenCalled();
    // Counting goes on while the toast is shown.
    await tap();
    expect(counter().props.accessibilityLabel).toBe('تم 2 من 100');
    await fireEvent.press(screen.getByText(DORAR_TOAST));
    expect(openUrl).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/dorar\.net\//));
    expect(screen.queryByText(DORAR_TOAST)).toBeNull();
    openUrl.mockRestore();
  });
});

describe('Reader — keep the screen on', () => {
  it('keeps the screen on while open (on by default), and lets it sleep after', async () => {
    const { view } = await open(1017);
    expect(activateKeepAwakeAsync).toHaveBeenCalledWith('wirduk-reader');
    await view.unmount();
    expect(deactivateKeepAwake).toHaveBeenCalledWith('wirduk-reader');
  });

  it('does nothing when the setting is off', async () => {
    await open(1017, (repos) => repos.settings.set('keepScreenOn', false));
    expect(activateKeepAwakeAsync).not.toHaveBeenCalled();
  });
});

describe('Reader — vibration when moving to the next dhikr', () => {
  it('vibrates (stronger than a count) when the reader moves on', async () => {
    await open(1013); // count 3
    await tap();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    await tap();
    await tap();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy');
  });

  it('does not when the setting is off', async () => {
    await open(1013, (repos) => repos.settings.set('nextDhikrVibration', false));
    await tap();
    await tap();
    await tap();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });
});

describe('Reader — continue where I stopped', () => {
  function captureAppState() {
    const listeners: ((s: AppStateStatus) => void)[] = [];
    // In the test setup addEventListener is already a mock: keep its own
    // behavior to put back (mockRestore would leave it returning undefined).
    const spy = jest.spyOn(AppState, 'addEventListener');
    const original = spy.getMockImplementation();
    spy.mockImplementation((_type, listener) => {
      listeners.push(listener as (s: AppStateStatus) => void);
      return { remove: jest.fn() } as never;
    });
    return {
      emit: async (s: AppStateStatus) => act(async () => listeners.forEach((l) => l(s))),
      restore: () => (original ? spy.mockImplementation(original) : spy.mockRestore()),
    };
  }

  it('saves the place and the counts when the app goes to the background', async () => {
    const appState = captureAppState();
    const { repos } = await open(1017);
    await tap();
    await tap();
    await appState.emit('background');
    await waitFor(async () =>
      expect(await repos.session.load()).toMatchObject({
        categoryId: 1,
        dhikrId: 1017,
        counts: { '1017': 2 },
      }),
    );
    // Back in the app: the state is still in memory, so the saved copy goes.
    await appState.emit('active');
    await waitFor(async () => expect(await repos.session.load()).toBeNull());
    appState.restore();
  });

  it('saves nothing when the setting is off', async () => {
    const appState = captureAppState();
    const { repos } = await open(1017, (r) => r.settings.set('restoreSession', false));
    await tap();
    await appState.emit('background');
    expect(await repos.session.load()).toBeNull();
    appState.restore();
  });
});

describe('Reader — screen off', () => {
  it('with "count with the audio", moves on and plays the next dhikr at once', async () => {
    const { adhkar } = await open(1013, (repos) => repos.settings.set('audioCounts', true));
    const i = adhkar.findIndex((d) => d.id === 1013);
    await fireEvent.press(screen.getByLabelText('تشغيل الصوت'));
    await waitFor(() => expect(recitationPlayer()?.play).toHaveBeenCalled());
    const player = recitationPlayer()!;
    const bg = inBackground();
    for (let n = 0; n < 3; n++) await act(async () => player.emit({ didJustFinish: true }));
    // No waiting for timers (they sleep with the screen off): already on the next one.
    expect(screen.getByText(`${i + 2} من ${adhkar.length}`)).toBeOnTheScreen();
    await waitFor(() =>
      expect(player.replace).toHaveBeenLastCalledWith({
        uri: `file:///docs/audio/ar/${audioFileName(adhkar[i + 1]!.audioFile!, 'mp3')}`,
      }),
    );
    bg.restore();
  });
});
