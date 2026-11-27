# وِرْدُك — Wirduk

An adhkar app (Hisn al-Muslim content) with a simple, modern design, for Android first.
No ads, no analytics, no accounts. Works offline (audio downloads are optional).

- Where the project stands and what comes next: [docs/status.md](docs/status.md)
- Decisions made since the [original brief](docs/brief.md): [docs/decisions.md](docs/decisions.md)
- How the code is organised, and how to add things: [docs/architecture.md](docs/architecture.md)
- Working notes for Claude Code (rules, commands, traps): [CLAUDE.md](CLAUDE.md)
- License: MIT for the code; third-party parts keep their own terms ([License](#license)).

## What it does

- **The adhkar of Hisn al-Muslim** in 133 chapters, with search, favorites and a custom order.
  The reader counts each dhikr with a tap, moves on by itself, and shows the source from
  [Dorar](https://dorar.net) and the fadl where there is one.
- **Audio** for most adhkar: downloaded on first play (or all at once), repeated as many times
  as the count, with autoplay, background playback and lock-screen controls.
- **The user's own adhkar** («أذكاري»): chapters and adhkar they write, with optional recordings,
  and a count or none («بلا حد»: count on until «إتمام»).
- **«أدومها»**: a habit plan that starts with one dhikr in the morning and one in the evening
  and grows step by step to the full adhkar.
- **Reminders** for the morning and evening (local notifications), **a backup file** and
  Android's automatic backup, and **"report an issue"**.

## Tech

- React Native + Expo SDK 57 (development build, not Expo Go), TypeScript
- Expo Router (routes in `src/app/`), feature folders in `src/features/`
- i18next (every UI string in `src/i18n/locales/ar/common.json`)
- SQLite (`expo-sqlite`) with FTS5 search; the content ships as a prebuilt database
- Jest + Testing Library; Maestro on the emulator

## Setup (Windows)

| Tool        | Version                                                          | Notes                                                    |
| ----------- | ---------------------------------------------------------------- | -------------------------------------------------------- |
| Node.js     | 24 LTS                                                           | `winget install OpenJS.NodeJS.LTS`                       |
| JDK         | 17                                                               | `winget install Microsoft.OpenJDK.17` (sets `JAVA_HOME`) |
| Android SDK | platform 36, build-tools 36.0.0, NDK 27.1.12297006, CMake 3.22.1 | At `%LOCALAPPDATA%\Android\Sdk`, with `ANDROID_HOME` set |
| Emulator    | Android 16 (API 36) x86_64 `google_apis` image                   | AVD name used here: `Wirdak_Pixel`                       |
| Maestro     | 2.x (optional, for `npm run e2e`)                                | In `%USERPROFILE%\.maestro\bin`                          |

The Android SDK packages can be installed without Android Studio:

```powershell
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
& "$sdk\cmdline-tools\latest\bin\android.exe" --no-metrics --sdk=$sdk sdk install `
  platform-tools emulator platforms/android-36 build-tools/36.0.0 `
  ndk/27.1.12297006 cmake/3.22.1 system-images/android-36/google_apis/x86_64
```

Then `npm install`.

## Run

```powershell
emulator -avd Wirdak_Pixel     # start the emulator
npm run android                # build + install the dev build (first time, or after native changes)
npm start                      # start Metro for the installed dev build
```

**A phone (standalone test build).** A release build has the JavaScript inside, so it runs
without Metro or the PC. It is signed with the debug key: fine for testing, not for Google Play.

```powershell
npx expo prebuild --platform android                                # if android/ does not exist
cd android
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a   # most phones are arm64
adb -s <device-id> install -r app\build\outputs\apk\release\app-release.apk
```

The owner's testers install from a fixed link, updated by `scripts/dev/phone-apk.ps1`.

## Scripts

| Command                                 | What it does                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| `npm run verify`                        | **Before every commit**: typecheck + lint + content check + all tests with coverage  |
| `npm test`, `npm run test:watch`        | All tests (logic + UI), once or in watch mode                                        |
| `npm run typecheck`, `npm run lint`     | TypeScript (app and scripts); ESLint + Prettier                                      |
| `npm run content:build`                 | Rebuild `assets/db/content.db` from `content-source/`                                |
| `npm run db:peek -- <id>…`              | Print adhkar from `content.db`: text, count, audio, source, fadl                     |
| `npm run dorar:receiver`, `dorar:apply` | Save Dorar pages read in Chrome; set a dhikr's source or fadl (`scripts/dorar/`)     |
| `npm run branding:build`                | Rebuild the logo, icon and splash images from `wirduk-logo/`                         |
| `npm run e2e`                           | The user flows with checks on the emulator (Maestro, release build; `e2e/README.md`) |
| `npm run e2e:timeline`                  | «أدومها» over 40 days, with the emulator's date moved (~30 min)                      |
| `npm run e2e:shots`, `shots:compare`    | A picture of every screen, then a compare with a baseline                            |

## Content (adhkar data)

The app ships a prebuilt SQLite database, `assets/db/content.db`; JSON is never parsed at
runtime. It is built from `content-source/`:

```
content-source/
  adhkar.json            Copy of rn0x/Adhkar-json (never edit it)
  source.json            Where it came from (repo, commit, license note)
  overrides.json         EVERY change we make: splits, counts, text fixes, line breaks, added adhkar
  dorar-sources.json     Sources and fadl quoted from dorar.net, per dhikr
  adwamuha-*.json        «أدومها»'s default plan, texts and messages
  audio-manifest.json    Size + SHA-256 of every hosted recording
  content-lock.json      Version + fingerprint of the last build (generated)
```

To change content: edit `overrides.json` (or use the tool for the part: `scripts/dorar/`,
`scripts/adwamuha/`, `scripts/content/apply-audio-sheet.ts`), bump `APP_CONFIG.content.version`
in `src/config/app-config.ts`, run `npm run content:build`, and commit everything it wrote
(`npm run verify` fails if any of it is out of date). A phone keeps its copy until the version
goes up. With a dev build, restart Metro with `--clear`. [docs/content-changes.md](docs/content-changes.md)
lists every change made to the book (generated); [docs/content-review.md](docs/content-review.md)
holds the owner's decisions on them.

- Display text keeps its tashkeel exactly as in the source; search uses a hidden column with no
  tashkeel and folded letters (`toSearchText`, also applied to the query).
- Dhikr ids are stable: `categoryId * 1000 + position in the source category`. The owner's added
  adhkar use positions 900+.
- Sources and fadl are copied word for word from Dorar; the build checks every quote. A fadl
  ships only when approved; a fadl `by: "owner"` is the owner's own words. Rules:
  [docs/decisions.md](docs/decisions.md) ("Sources from Dorar"); review list:
  [docs/sources-review.md](docs/sources-review.md) (generated).

## How the parts work

- **Data.** Two databases: `content-v{N}.db` (a read-only copy of `content.db`, replaced when the
  content version goes up) and `user.db` (favorites, order, settings, the user's own adhkar,
  «أدومها», never replaced; changed only by migrations). Counters live in memory; "continue
  where I stopped" saves the place for 5 hours.
- **The user's own adhkar** have negative ids (row 5 is `-5`), so routes, counters and favorites
  share one id space with the book. Their recordings are copied to the app's `custom-audio/`.
- **Audio.** Hosted in the public repo `wirduk-audio` on GitHub Pages
  (`https://tameemhabash.github.io/wirduk-audio/audio/<lang>/<file>`; the privacy policy is at
  `/privacy/`). A file counts as downloaded only with its full size. Settings → audio downloads
  the morning and evening recordings at once. «العدّ مع الصوت» (on by default): each finished play
  counts, and at the count the reader moves on and plays the next dhikr.
- **Reminders.** Morning (6:00) and evening (17:00), off by default, local notifications only.
  A tap opens the morning or evening adhkar; with «أدومها» on, the ward (only in its time).
- **«أدومها».** The owner's description: [docs/adwamuha/feature-prompt.md](docs/adwamuha/feature-prompt.md);
  every state: [docs/adwamuha/states.md](docs/adwamuha/states.md). A step of N weeks needs N
  good weeks (4 mornings and 4 evenings each), and the next dhikr is added only when the user
  says so. Its data stays on the phone.
- **Report an issue.** A description, up to 4 screenshots and the device details, shown before
  sending, posted to a small relay (`workers/report/`, a Cloudflare Worker) that opens an issue
  in a private GitHub repo. The row shows only when `APP_CONFIG.report.endpoint` is set.

## Backup

Two kinds, no sign-in and no server of ours:

- **A backup file** (Settings → «النسخ الاحتياطي»): `wirduk-backup-YYYY-MM-DD.wirduk`, shared
  with the share sheet. It is a SQLite database: a copy of `user.db` plus the user's own
  recordings. Restoring checks the file, brings an older one up to date with the usual
  migrations, keeps a safety copy, then starts the app again. Code: `src/data/backup/`,
  `src/features/backup/`.
- **Android's automatic backup** to the user's own Google Drive keeps only `user.db` and the
  backup date (`modules/wirduk-backup`, `plugins/with-backup-agent.js`). Home shows a gentle note
  after 30 days with no backup of either kind.

Test Android's backup on the emulator (local transport):

```powershell
& $adb shell bmgr enable true
& $adb shell bmgr transport com.android.localtransport/.LocalTransport
& $adb shell bmgr backupnow com.wirduk.app          # logcat FullBackup_native: what was copied
& $adb shell pm clear com.wirduk.app
& $adb shell bmgr list sets                         # the token, e.g. 1
& $adb shell bmgr restore 1 com.wirduk.app
& $adb shell bmgr transport com.google.android.gms/.backup.BackupTransportService
& $adb shell bmgr enable false
```

## Logo, icons, splash and fonts

- `npm run branding:build` turns the two SVGs in `wirduk-logo/` into the in-app logo, the app
  icon, the Android adaptive and themed icons, the splash images and the notification icon.
  Then rebuild the native app (`npx expo prebuild --clean` + `npm run android`).
- All fonts are embedded at build time (`expo-font` plugin in `app.config.ts`) and listed in
  `src/theme/fonts.ts`; file name = PostScript name. UI: IBM Plex Sans Arabic (one family per
  weight). Dhikr: Amiri Quran (default), Amiri, Scheherazade New, Noto Naskh Arabic, each with
  its own line height. All SIL OFL-1.1 (`assets/fonts/SOURCES.md`). KFGQPC Uthmanic Hafs is
  **not** included: its license needs written approval from the King Fahd Complex.

## Tests

Two Jest projects (`jest.config.js`):

- **logic**: plain TypeScript in Node (`*.test.ts`): the data layer on Node's SQLite (with the
  shipped `content.db`), pure logic, the scripts, the relay.
- **ui**: screens and components with Testing Library (`*.test.tsx`), rendered with the **real**
  repositories (`src/test-utils/render-app.tsx`). Native-only modules are mocked in
  `jest.setup.ui.ts`. In Testing Library 14, `render` and `fireEvent` are async: always `await`.

The test kit (`src/test-utils/`): `givenAdwamuha(repos, { step, startedOn })`, `givenWardRead`
and `givenDaysRead` set up the user's data; `tr('key')` finds UI text from `common.json` (tests
type no UI Arabic); `fixtures/content.ts` names the content ids (`DHIKR.hundredTimes`);
`reader.tsx` opens the reader and taps the counter; `mocks/` holds the stand-ins for audio (what
was heard: `recordingsHeard()`), the router (`tryToLeave()` runs the unsaved-changes guard),
notifications and lists. «أدومها» over days: `startScenario` and its day-by-day scripts
(`s.play('days 2-7: both wards')`).

- Tests check behavior (what the user sees and hears, what is saved), not call counts or style
  props (the colour, contrast and layout guards are the exception).
- Coverage has a floor (`coverageThreshold` in `jest.config.js`); `npm run verify` runs with
  coverage, so a drop fails it.
- Lists render more rows on their own 50 ms timer. If a test changes a list's data at its end,
  finish with `await settleLists()`, or React may warn about an update outside `act()`.
- On the emulator: `npm run e2e` (user flows), `npm run e2e:timeline` («أدومها» over 40 days),
  `npm run e2e:shots` (every screen) — see [e2e/README.md](e2e/README.md). Touch, vibration and
  font rendering on a real phone: [docs/manual-test-checklist.md](docs/manual-test-checklist.md).

## Develop with Claude Code

The project is built with [Claude Code](https://claude.com/claude-code):

- `CLAUDE.md` (rules, commands, general traps), and a `CLAUDE.md` in `src/data/`,
  `src/features/reader/`, `src/features/adwamuha/`, `scripts/` and `e2e/` for the rules of each
  area.
- `.claude/settings.json`: the safe commands that need no prompt, and a hook
  (`.claude/hooks/guard-git.mjs`, checks in `scripts/dev/git-guard.ts`) that blocks AI
  attribution in commit messages and any push to `origin` but `main`.
- `.claude/skills/`: `/finish-milestone`, `/check-screens`, `/content-change`, `/phone-apk`.

To work on a fork: follow "Setup", run `npm run verify`, then ask Claude Code for the next step
(`docs/status.md`). The audio site and the privacy page are in the separate repo
`TameemHabash/wirduk-audio`. The history before the public start (and the raw Dorar research)
is in a private archive.

## License

The code is under the **MIT License** ([LICENSE](LICENSE)): anyone may use, copy, change and build
apps with it. Parts made by others keep their own terms:

| Part                         | Where                               | Terms                                                                                                                  |
| ---------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Adhkar text (Hisn al-Muslim) | `content-source/adhkar.json`        | From [rn0x/Adhkar-json](https://github.com/rn0x/Adhkar-json): "no license, free to use" (`content-source/source.json`) |
| Sources, gradings and fadl   | `content-source/dorar-sources.json` | Quoted from [dorar.net](https://dorar.net) (الموسوعة الحديثية), with a link to each page                               |
| Quran text                   | `.local/tanzil/`                    | [Tanzil](https://tanzil.net), Creative Commons Attribution 3.0: verbatim copies only, keep its header                  |
| Fonts                        | `assets/fonts/`                     | SIL Open Font License 1.1 (each font's `OFL-*.txt`)                                                                    |
| Tick sound                   | `assets/sounds/`                    | CC0 1.0, Kenney (`assets/sounds/SOURCES.md`)                                                                           |
| Logo and name                | `wirduk-logo/`, «وِرْدُك»           | They identify this app: a fork that publishes its own app uses its own name and logo                                   |
| Recordings                   | not in this repo                    | Hosted in `wirduk-audio`; their own terms apply                                                                        |
