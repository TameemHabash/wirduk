// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

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
      // Kept as it was run on 2026-10-17 (see its README); not part of the app or the build.
      'research/**',
      // Generated from the owner's description (scripts/adwamuha/owner-texts.ts).
      'src/features/adwamuha/owner-texts.ts',
    ],
  },
  {
    // App code runs on the phone: Node modules and test helpers do not exist there.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}', 'src/test-utils/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['node:*'], message: 'Node modules are not available in the app.' },
            {
              group: ['@/test-utils/*', '**/test-utils/*'],
              message: 'Test helpers are for tests only.',
            },
            { group: ['**/scripts/*'], message: 'Build scripts are not part of the app.' },
          ],
        },
      ],
    },
  },
]);
