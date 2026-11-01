/* Setup for the "ui" Jest project (React Native components). */
import 'react-native-gesture-handler/jestSetup';

import '@/i18n';

import { resetAudioMocks } from '@/test-utils/audio-mock';
import { resetNotificationMocks } from '@/test-utils/notifications-mock';
import { resetRouterMock } from '@/test-utils/router-mock';

// Reanimated 4 runs on react-native-worklets; both ship their own mocks.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  // Missing from the mock in this version.
  useReducedMotion: () => false,
}));

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// Lists draw every row at once in tests (src/test-utils/simple-lists.tsx): the real ones draw
// more rows on a 50 ms timer, which sometimes fired after a test had ended.
jest.mock('react-native/Libraries/Lists/FlatList', () => ({
  __esModule: true,
  default: require('@/test-utils/simple-lists').FlatList,
}));
jest.mock('react-native/Libraries/Lists/SectionList', () => ({
  __esModule: true,
  default: require('@/test-utils/simple-lists').SectionList,
}));

// Native pager: render all pages; setPage reports the change like the real one.
jest.mock('react-native-pager-view', () => {
  const React = require('react');
  const { View } = require('react-native');
  const PagerView = React.forwardRef(
    (
      props: {
        children: unknown;
        onPageSelected?: (e: unknown) => void;
        onPageScrollStateChanged?: (e: unknown) => void;
      },
      ref: React.Ref<unknown>,
    ) => {
      React.useImperativeHandle(ref, () => ({
        setPage: (position: number) => props.onPageSelected?.({ nativeEvent: { position } }),
        setPageWithoutAnimation: (position: number) =>
          props.onPageSelected?.({ nativeEvent: { position } }),
      }));
      // The page events on the view, so a test can swipe (fireEvent: 'pageScrollStateChanged'
      // to 'dragging', then 'pageSelected').
      return React.createElement(
        View,
        {
          testID: 'pager',
          onPageSelected: props.onPageSelected,
          onPageScrollStateChanged: props.onPageScrollStateChanged,
        },
        props.children,
      );
    },
  );
  return { __esModule: true, default: PagerView };
});

// The drag itself is native (checked on a device); tests only need the list.
jest.mock('react-native-reorderable-list', () => {
  const React = require('react');
  const { FlatList } = require('react-native');
  return {
    __esModule: true,
    default: (props: object) => React.createElement(FlatList, props),
    useReorderableDrag: () => () => undefined,
    reorderItems: <T>(data: T[], from: number, to: number): T[] => {
      const next = [...data];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved as T);
      return next;
    },
  };
});

jest.mock('expo-router', () => {
  const { mockRouter, getRouteParams, mockNavigation } = require('@/test-utils/router-mock');
  const React = require('react');
  return {
    useRouter: () => mockRouter,
    router: mockRouter,
    useLocalSearchParams: () => getRouteParams(),
    useNavigation: () => mockNavigation,
    // Screens are always "focused" in tests: run the effect like useEffect.
    useFocusEffect: (effect: () => void | (() => void)) => React.useEffect(effect, [effect]),
    Stack: { Screen: () => null },
    Link: ({ children }: { children: unknown }) =>
      React.createElement(React.Fragment, null, children),
  };
});

jest.mock('expo-audio', () => {
  const m = require('@/test-utils/audio-mock');
  const React = require('react');
  return {
    // One player per hook call; a new `source` argument replaces the old one.
    useAudioPlayer: (source: unknown) => {
      const [player] = React.useState(() => {
        const p = m.createMockPlayer(source);
        m.mockPlayers.push(p);
        return p;
      });
      const last = React.useRef(source);
      if (last.current !== source) {
        last.current = source;
        player.source = source;
      }
      return player;
    },
    useAudioPlayerStatus: () => ({ playing: false, duration: 0, didJustFinish: false }),
    useAudioRecorder: () => m.mockRecorder,
    useAudioRecorderState: () => m.recorderState,
    RecordingPresets: { HIGH_QUALITY: {} },
    requestRecordingPermissionsAsync: () => Promise.resolve({ granted: m.mockPermission.granted }),
    setAudioModeAsync: () => Promise.resolve(),
  };
});

jest.mock('expo-document-picker', () => require('@/test-utils/audio-mock').mockPicker);

jest.mock(
  '@/features/custom/custom-audio',
  () => require('@/test-utils/audio-mock').mockCustomAudio,
);

jest.mock('@/features/audio/expo-audio-storage', () => ({
  expoAudioStorage: require('@/test-utils/audio-mock').mockAudioStorage,
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));

// Native image work: a picked screenshot becomes a tiny "JPEG".
jest.mock('@/features/report/shrink-image', () => ({
  shrinkImage: jest.fn((uri: string) =>
    Promise.resolve({ uri: `${uri}#small`, type: 'image/jpeg', data: '/9j/AAAA' }),
  ),
}));

// The phone has 12.3 GB free.
jest.mock('@/features/report/free-space', () => ({
  freeStorageBytes: jest.fn(() => 12.3 * 1024 ** 3),
}));

jest.mock('expo-notifications', () => require('@/test-utils/notifications-mock').mockNotifications);
jest.mock(
  '@react-native-community/datetimepicker',
  () => require('@/test-utils/notifications-mock').mockDateTimePicker,
);

beforeEach(() => {
  resetRouterMock();
  resetAudioMocks();
  resetNotificationMocks();
  // Each test is a fresh app start for "continue where I stopped".
  require('@/features/session/useSessionRestore').newAppStart();
});
