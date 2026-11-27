This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility. Project rules, commands and traps: `CLAUDE.md`.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json` (SDK 57 here).
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

This project uses npm (`package-lock.json`).

```bash
npx expo install <package>          # ALWAYS use instead of npm install <package> — resolves SDK-compatible versions
npx expo start --dev-client         # start Metro for the installed development build
npm run android                     # build + install the development build (first time, or after a native change)
npm run verify                      # typecheck + lint + content check + all tests: run before declaring a task done
npx expo-doctor                     # diagnose dependency and config issues
npx expo install --fix              # fix incompatible package versions
```

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. A route file is one line: it re-exports a screen from `src/features/<name>/screens/`. Keep non-route code outside `src/app/` (`docs/architecture.md`).
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Builds

- Development and test builds are made **locally** with Gradle: the development build with `npm run android`; release APKs for the emulator's Maestro runs (`Install-E2eApk`, `e2e/README.md`) and for the testers' phones (`scripts/dev/phone-apk.ps1`, only when the owner asks).
- EAS is for the store builds (Google Play, later the App Store). Run EAS CLI as `npx eas-cli@latest <command>`; substitute that for bare `eas` in docs examples. Docs: https://docs.expo.dev/eas/index.md

## Rules

- `android/` (and `ios/`) are generated (Continuous Native Generation) and not in git. Never create or edit them by hand — configure native behavior in `app.config.ts`, config plugins (`plugins/`) and local Expo modules (`modules/`), then `npx expo prebuild --platform android`.
- This app does not run in Expo Go. After adding a library with native code, build the development build again: `npm run android`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
