// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

/** Imports app code may never use (it runs on the phone). */
const APP_ONLY = [
  { group: ['node:*'], message: 'Node modules are not available in the app.' },
  { group: ['@/test-utils/*', '**/test-utils/*'], message: 'Test helpers are for tests only.' },
  { group: ['**/scripts/*'], message: 'Build scripts are not part of the app.' },
];
/** The layers under the features: they may not import a feature (types are fine). */
const NO_FEATURES = {
  group: ['@/features/*', '@/app/*', '@/providers/*'],
  allowTypeImports: true,
  message: 'Shared code and data may not import a feature (see docs/architecture.md).',
};
const restrict = (patterns) => ({
  'no-restricted-imports': ['error', { patterns: [...APP_ONLY, ...patterns] }],
});

module.exports = defineConfig([
  expoConfig,
  prettierRecommended,
  {
    ignores: [
      'dist/*',
      'android/*',
      'ios/*',
      'coverage/*',
      '.expo/*',
      '.local/*',
      'e2e/.generated/*',
      // Generated from the owner's description (scripts/adwamuha/owner-texts.ts).
      'src/features/adwamuha/generated/owner-texts.ts',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // No import cycles: they make the load order fragile and the code hard to follow.
      'import/no-cycle': 'error',
      // `useAsync(load, deps)` gets its deps checked like useEffect.
      'react-hooks/exhaustive-deps': ['warn', { additionalHooks: '(useAsync)' }],
    },
  },
  {
    // App code runs on the phone: Node modules and test helpers do not exist there.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}', 'src/test-utils/**'],
    rules: restrict([]),
  },
  {
    // The layers: features use data, shared UI and lib; never the other way round.
    files: [
      'src/components/**/*.{ts,tsx}',
      'src/data/**/*.{ts,tsx}',
      'src/hooks/**/*.{ts,tsx}',
      'src/lib/**/*.{ts,tsx}',
      'src/theme/**/*.{ts,tsx}',
      'src/i18n/**/*.{ts,tsx}',
      'src/config/**/*.{ts,tsx}',
    ],
    ignores: ['src/**/*.test.{ts,tsx}'],
    rules: restrict([NO_FEATURES]),
  },
]);
