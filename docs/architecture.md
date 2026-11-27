# Architecture

An Expo Router app (SDK 57, React Native 0.86), Android first. Code is grouped **by feature**;
shared code sits in a few small folders under it. This page says where code goes and what may
import what. The lint rules in `eslint.config.js` check the import rules.

## Folders

```
src/
  app/                 routes only (Expo Router). One line each: export a screen from a feature.
                       _layout.tsx = the providers + the screen list.
  providers/           AppProviders.tsx: every app-wide provider, in order.
  features/<name>/     one area of the app (reader, adwamuha, adhkar, home, settings, ...):
    screens/             the screens the routes show (*Screen.tsx)
    components/          parts of those screens
    hooks/               React hooks of the feature
    logic/               pure TypeScript: no React, no database (easy to test)
    state/               providers and stores (React context, in-memory stores)
    services/            the phone: files, notifications, audio storage, sending a report
    generated/           files written by a script (never edit by hand)
    __tests__/           tests that cover several screens of the feature
  components/
    ui/                  the design's building blocks: AppText, Button, Icon, Dialog, Toast, rows
    layout/              Screen, AppBar, StartupError
    navigation/          the tab bar
  hooks/               shared hooks (useAsync, useUnsavedGuard, useTickSound)
  lib/                 shared helpers with no screen (normalize, time, haptics, time picker)
  data/                the databases: db/ (open, migrate), repositories/ (the only code that runs
                       SQL, one class per file), models/ (the types they return), settings/,
                       backup/, DataProvider (opens everything at start)
  theme/ i18n/ config/ the look, the texts (common.json), app constants
  test-utils/          test helpers and mocks (tests only)
```

A feature keeps only the folders it needs. A test sits next to the file it tests
(`useAsync.ts` → `useAsync.test.ts`).

## Who may import what

- `app/` → features (and `providers/`).
- `features/*` → `data/`, `components/`, `hooks/`, `lib/`, `theme/`, `i18n/`, `config/`, and other
  features (no cycles).
- `data/`, `components/`, `hooks/`, `lib/`, `theme/`, `i18n/`, `config/` → never a feature
  (a type import is fine). So «أدومها»'s shared types live in `data/models/adwamuha.ts`.
- No import cycles anywhere (`import/no-cycle`).
- App code never imports Node modules, `test-utils/` or `scripts/`.

Imports: `./x` in the same folder, `@/…` otherwise. Scripts run by Node (`scripts/`) import app
files by relative path with the `.ts` extension, so the files they use stay free of `@/` imports
(`config/app-config.ts`, `data/models/adwamuha.ts`, `lib/normalize.ts`, ...).

## Names

Components `PascalCase.tsx`, hooks `useThing.ts`, everything else `kebab-case.ts`.

## Data flow

`DataProvider` opens the content database (shipped, read-only, one file per content version) and
`user.db` (the user's data, migrations in `data/db/user-schema.ts`: add, never edit), then makes
the repositories. Screens get them with `useRepositories()`. App state that many screens share
lives in providers: settings (`SettingsProvider`), «أدومها» (`AdwamuhaProvider`), audio
(`AudioProvider`), the chapters (`CategoriesProvider`: Home, the «الأذكار» tab, the reorder
screen; one read for all of them).

## Speed rules (RF5)

- A provider whose state changes often also gives a context that never changes, for screens
  that only act: «أدومها»'s actions (`useAdwamuhaActionsOptional`), audio's
  (`useAudioActions`). And a small hook for one value: `useAdwamuhaEnabled`. Use the narrowest
  hook a screen needs; `useAdwamuha()` draws again on every change of «أدومها»'s data.
- A list read again (a screen shown again) keeps the old objects when nothing changed
  (`keepSame`, `lib/keep-same.ts`), so `memo` rows do not draw again.
- A long list is a `FlatList` (only the rows near the screen are drawn), not a `.map` in a
  `ScrollView`. The reader draws the pages near the current one (`useDrawnPages`).
- The counters: a component watches only the count it shows (`useCount`, `useCompleteFlags`
  in `reader/state/useCounters.ts`), so a tap draws only the counter and the progress.
- Measure before and after on the release build: `Measure-E2ePerf`, `Measure-E2eCpu`,
  `Measure-E2eLatency` (`scripts/dev/e2e.ps1`, `e2e/README.md`).
