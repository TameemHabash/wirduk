# Architecture

An Expo Router app (SDK 57, React Native 0.86), Android first. Code is grouped **by feature**;
shared code sits in a few small folders under it. This page says where code goes, what may
import what, how data moves, and how to add the usual things. The lint rules in
`eslint.config.js` check the import rules.

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
content-source/        the content inputs (the book, overrides, Dorar sources, «أدومها»'s plan)
assets/db/content.db   the content database the app ships (built by scripts/content/)
scripts/               Node scripts: the content build, Dorar, «أدومها»'s texts, dev helpers
e2e/                   Maestro flows on the emulator (release build)
modules/ plugins/      native code: a local Expo module (backup agent) and config plugins
workers/report/        the Cloudflare Worker that turns a report into a GitHub issue
```

A feature keeps only the folders it needs. A test sits next to the file it tests
(`useAsync.ts` → `useAsync.test.ts`).

## The features

| Feature     | What it holds                                                                                                                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `home`      | Home: the golden card of now (`TimeOfDayCards`, `components/ui/GoldCard.tsx`) or «وردك اليوم» when «أدومها» is on; the favorites as tiles; the backup note.                                                               |
| `adhkar`    | The «الأذكار» tab: the search box (results in place of the lists), «أذكاري» first, every chapter (`FlatList`); `/reorder` (saved only with «حفظ»); `CategoriesProvider` (one read of the chapters for Home and the tab). |
| `reader`    | The reader, its counters, the finish screen, "continue where I stopped" (`src/features/reader/CLAUDE.md`).                                                                                                                |
| `audio`     | The player (`useDhikrAudio`), the download manager (`services/audio-downloads.ts`; scopes: the morning and evening recordings, shown, or all, hidden; `removeUnused` at start), `AudioProvider`.                          |
| `custom`    | The user's own chapters and adhkar (negative ids, `data/models/custom-ids.ts`), their editors and recordings (`custom-audio/` on the phone).                                                                               |
| `adwamuha`  | «أدومها», the habit plan (`src/features/adwamuha/CLAUDE.md`).                                                                                                                                                             |
| `reminders` | The morning and evening notifications: `services/reminders.ts` (permission, channel, schedule), `useReminderSync` (in `AppProviders`), `useNotificationTaps` (in Home, before `useSessionRestore`).                       |
| `settings`  | The Settings tab and its rows.                                                                                                                                                                                            |
| `backup`    | The backup file (save, share, restore) and the Android backup date; the core is `data/backup/`.                                                                                                                           |
| `report`    | "Report an issue": `ReportScreen`, `report.ts` (details, send), `shrink-image.ts`, `report-protocol.ts` (the format and limits, **shared with the relay** in `workers/report/`).                                           |
| `about`     | The About screen.                                                                                                                                                                                                         |

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
(`config/app-config.ts`, `data/models/adwamuha.ts`, `lib/normalize.ts`,
`features/audio/logic/audio-plan.ts`, `i18n/languages.ts`).

## Names

Components `PascalCase.tsx`, hooks `useThing.ts`, everything else `kebab-case.ts`.

## Start and data flow

1. `src/app/_layout.tsx` keeps the splash screen and wraps the screen list in `AppProviders`.
2. `AppProviders` (in this order): `DataProvider` → `SettingsProvider` → `AdwamuhaProvider` →
   `AudioProvider` → `CategoriesProvider` → the theme → the navigator's theme → `ToastProvider` →
   `DialogProvider`. It also calls `newAppStart()` once per root and `useReminderSync()`.
3. `DataProvider` opens the content database (shipped, read-only, one file per content version)
   and `user.db` side by side (`data/db/open-databases.ts`), runs the migrations, and makes the
   repositories. While it loads, nothing renders (the splash stays); on failure it shows
   `StartupError` with a retry. After a restore, `useRestartApp()` starts every provider below
   again.
4. Screens get the repositories with `useRepositories()` and the settings with `useSettings()`.
   State that many screens share lives in the providers above. A plain load in a screen uses
   `useAsync(load, deps)` (`hooks/useAsync.ts`).
5. Only repositories run SQL. They take the small `SqlDatabase` interface (`data/db/sql.ts`), so
   tests run the same SQL on Node's SQLite with the shipped `content.db`.

The content never changes on the phone; the user's data is only in `user.db` (and the user's
recordings in the app's files). Rules and traps of the data layer: `src/data/CLAUDE.md`.

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

## How to add

### A screen

1. The screen: `src/features/<name>/screens/ThingScreen.tsx`, inside `Screen`
   (`components/layout/Screen.tsx`). Its own top bar with an action (an editor): `AppBar`.
2. The route: a one-line file in `src/app/`, e.g. `src/app/thing.tsx`:
   `export { ThingScreen as default } from '@/features/<name>/screens/ThingScreen';`
3. Its header: a `<Stack.Screen name="thing" options={{ title: t('thing.title') }} />` in
   `src/app/_layout.tsx` (or `headerShown: false` when it draws its own).
4. Start Metro once: it rewrites `.expo/types/router.d.ts`, and only then does `tsc` accept
   `router.push('/thing')`.
5. A test next to it (`ThingScreen.test.tsx`, rendered with `renderWithApp`), and a picture in
   the Maestro screen run (`e2e/shots/`) if the owner will look at it.

### A feature

A new folder `src/features/<name>/` with only the folders it needs. A provider of app-wide
state goes in `state/` and into `AppProviders` at the place its needs allow (after what it
reads). Data it shares with `data/` code goes in `data/models/`.

### A table or a column (migration)

1. Add a new string at the **end** of `USER_MIGRATIONS` in `data/db/user-schema.ts` (its index + 1
   is the new schema version). Never edit a shipped one.
2. The SQL that uses it goes in a repository (`data/repositories/`, one class per file), with
   its test (`*-repository.test.ts`, on a fresh database from `createUserDb()`).
3. A new repository: add it to `Repositories` and `DataProvider`, and to `src/test-utils/render-app.tsx`.
4. Decide if the table goes in the backup file: phone-only tables are listed in `DEVICE_TABLES`
   (`data/backup/backup-db.ts`).
5. Old data must keep loading: phones may hold any older schema, and Android's backup can bring
   an old `user.db` back.

### A setting

Add it to `AppSettings`, `DEFAULT_SETTINGS` and the validation in `data/settings/settings.ts`
(with a test), then read it with `useSettings()`. A setting is a row of the `Settings` table:
no migration.

### A UI string

Every string the user sees is in `src/i18n/locales/ar/common.json`, read with
`const { t } = useTranslation()`. Tests find it with `tr('key')` (no typed Arabic). The app needs
a full restart to see a new string (Fast Refresh does not reload it). «أدومها»'s texts from the
owner and the design are generated by scripts (`src/features/adwamuha/CLAUDE.md`).

### A content change

Anything under `content-source/` (the book's text, counts, sources, «أدومها»'s plan or texts,
recordings): follow the `/content-change` skill (stop Metro, bump the content version,
`npm run content:build`, start Metro clean). Never retype Arabic content: cut it from its source
with a script (`scripts/CLAUDE.md`).

### A native module or plugin

`npx expo install <package>`, the plugin in `app.config.ts` (or a local one in `plugins/`, a
local module in `modules/`), then `npx expo prebuild --platform android` and `npm run android`.
`android/` is generated: never edit it.

## Notes

- A notification tapped while the app was closed is read with `getLastNotificationResponse()`
  (sync, SDK 57) and cleared after use (`clearLastNotificationResponseAsync`), so a reload does not
  open it again.
- Toasts rise above the tab bar (`useToastOffset`). Use the app's `Dialog`, never Android's
  `Alert.alert`.
- Deep links (`wirduk://`): `category/<id>?dhikr=<dhikrId>`, `custom`, `custom/<-id>/dhikr/new`,
  `settings`, `adhkar`, `search` (→ `/adhkar?focus=search`, the keyboard up), `audio`, `about`, and
  `dev-clock` (dev build only).
