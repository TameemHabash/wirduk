import type { ConfigContext, ExpoConfig } from 'expo/config';

// The `.ts` extension is needed: the Expo config loader runs this file in plain Node.
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, directionOf } from './src/i18n/languages.ts';
import { COLORS } from './src/theme/colors.ts';
import { FONT_FILES } from './src/theme/fonts.ts';

const isRtl = directionOf(DEFAULT_LANGUAGE) === 'rtl';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'وردك',
  slug: 'wirduk',
  scheme: 'wirduk',
  version: '1.0.0',
  // Follows the phone's auto-rotate (owner request 2026-10-22). Needs a native rebuild.
  orientation: 'default',
  // Icons and splash images are built from wirduk-logo/ by `npm run branding:build`.
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.wirduk.app',
    buildNumber: '1',
    supportsTablet: true,
  },
  android: {
    package: 'com.wirduk.app',
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#EFE9DC',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    // Not needed (milestone 13): files come through the system's file picker (no storage
    // access), and only the dev tools draw over other apps.
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
  },
  plugins: [
    'expo-router',
    [
      'expo-localization',
      {
        // Layout direction comes from the app language, not from the device.
        supportsRTL: true,
        forcesRTL: isRtl,
        supportedLocales: SUPPORTED_LANGUAGES,
      },
    ],
    ['expo-sqlite', { enableFTS: true }],
    [
      'expo-audio',
      {
        enableBackgroundPlayback: true,
        // The user can record their own voice for their own adhkar.
        recordAudioAndroid: true,
        microphonePermission:
          'يستخدم وِرْدُك الميكروفون لتسجيل صوتك للأذكار التي تضيفها بنفسك فقط.',
      },
    ],
    'expo-document-picker',
    // Morning and evening reminders (local only; no push, no server).
    ['expo-notifications', { icon: './assets/notification-icon.png', color: COLORS.light.primary }],
    // Fonts are embedded in the native app: no loading delay, no flash of the system font.
    ['expo-font', { fonts: FONT_FILES }],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 200,
        backgroundColor: COLORS.light.background,
        dark: { image: './assets/splash-icon-dark.png', backgroundColor: COLORS.dark.background },
      },
    ],
    'expo-asset',
    'expo-status-bar',
    // The backup file is handed to the share sheet (sharing out only: receiving is not turned on).
    'expo-sharing',
    // Android's automatic backup: only the user's own small data, with its date (milestone 12).
    './plugins/with-backup-agent',
  ],
  experiments: {
    typedRoutes: true,
  },
});
