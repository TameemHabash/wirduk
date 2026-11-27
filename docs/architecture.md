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
(`AudioProvider`).
