/**
 * Two Jest projects:
 *  - logic: plain TypeScript (data layer, text, counters, download manager, scripts).
 *           Runs in Node, so repository tests can use Node's built-in SQLite (with FTS5).
 *  - ui:    React Native components and screens (jest-expo preset).
 */
const moduleNameMapper = { '^@/(.*)$': '<rootDir>/src/$1' };

module.exports = {
  // Mock call counts start at zero in every test (set per project below).
  projects: [
    {
      displayName: 'logic',
      clearMocks: true,
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/**/*.test.ts',
        '<rootDir>/scripts/**/*.test.ts',
        '<rootDir>/workers/**/*.test.ts',
      ],
      transform: {
        '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }],
      },
      moduleNameMapper,
    },
    {
      displayName: 'ui',
      clearMocks: true,
      preset: 'jest-expo',
      testMatch: ['<rootDir>/src/**/*.test.tsx'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ui.ts'],
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-reorderable-list|i18next|react-i18next)',
      ],
      moduleNameMapper,
    },
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.test.{ts,tsx}', '!src/app/**'],
};
