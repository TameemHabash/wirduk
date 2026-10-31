# وِرْدُك — Wirduk

An adhkar app (Hisn al-Muslim content) with a simple, modern design.
No ads, no analytics, no accounts. Works offline (audio downloads are optional).

- Original brief: [docs/brief.md](docs/brief.md)
- Decisions made since: [docs/decisions.md](docs/decisions.md)
- Where the project stands, and the plan for the next milestones: [docs/status.md](docs/status.md)
- Working notes for Claude Code (commands, traps, rules): [CLAUDE.md](CLAUDE.md)
- License: MIT for the code; third-party parts keep their own terms ([License](#license)).

## Tech

- React Native + Expo SDK 57 (development build, not Expo Go), TypeScript
- Expo Router (routes in `src/app/`)
- i18next (all UI strings in `src/i18n/locales/`)
- SQLite (`expo-sqlite`) with FTS5 search

## Setup (Windows)

You need:

| Tool        | Version                                                          | Notes                                                    |
| ----------- | ---------------------------------------------------------------- | -------------------------------------------------------- |
| Node.js     | 24 LTS                                                           | `winget install OpenJS.NodeJS.LTS`                       |
| JDK         | 17                                                               | `winget install Microsoft.OpenJDK.17` (sets `JAVA_HOME`) |
| Android SDK | platform 36, build-tools 36.0.0, NDK 27.1.12297006, CMake 3.22.1 | At `%LOCALAPPDATA%\Android\Sdk`, with `ANDROID_HOME` set |
| Emulator    | Android 16 (API 36) x86_64 image                                 | AVD name used here: `Wirdak_Pixel`                       |

Android SDK packages can be installed without Android Studio:

```powershell
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
& "$sdk\cmdline-tools\latest\bin\android.exe" --no-metrics --sdk=$sdk sdk install `
  platform-tools emulator platforms/android-36 build-tools/36.0.0 `
  ndk/27.1.12297006 cmake/3.22.1 system-images/android-36/google_apis/x86_64
```

Then:

```powershell
npm install
```

## Run on the emulator

```powershell
emulator -avd Wirdak_Pixel           # start the emulator
npm run android                      # build + install the dev build (first time, or after native changes)
npm start                            # start Metro for the installed dev build
```

## Install on a phone (standalone test build)

A release build has the JavaScript inside, so it runs without Metro or the PC. It is signed with
the debug key: fine for testing, not for Google Play.

```powershell
cd android
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a   # most phones are arm64
adb -s <device-id> install -r app\build\outputs\apk\release\app-release.apk
```

(`adb devices -l` lists the device ids. Run `npx expo prebuild --platform android` first if
`android/` does not exist.)

## Scripts

| Command                   | What it does                                                               |
| ------------------------- | -------------------------------------------------------------------------- |
| `npm test`                | All tests (logic + UI)                                                     |
| `npm run test:watch`      | Tests in watch mode                                                        |
| `npm run typecheck`       | TypeScript check                                                           |
| `npm run lint`            | ESLint + Prettier check                                                    |
| `npm run content:build`   | Rebuild `assets/db/content.db` from `content-source/`                      |
| `npm run branding:build`  | Rebuild the logo, icon and splash images from `wirduk-logo/`               |
| `npm run dorar:receiver`  | Save Dorar pages read in Chrome (see `scripts/dorar/README.md`)            |
| `npm run dorar:apply`     | Set, change or remove one dhikr's Dorar source or fadl                     |
| `npm run db:peek -- <id>` | Print adhkar from `content.db`: text, count, audio, source, fadl           |
| `npm run verify`          | **Run before every release**: typecheck + lint + content check + all tests |

## Project layout

```
src/
  app/          Routes only (thin files that re-export screens)
  features/     Screens and feature logic (home, reader, settings, audio, ...)
  components/   Shared UI pieces
  data/         Database access: models + repositories (no UI code)
  i18n/         Languages, direction (RTL/LTR), UI strings
  theme/        Colors, spacing, light/dark/system theme
  config/       App constants (audio host URL, content version, ...)
scripts/        Build-time scripts (content database)
content-source/ Our copy of the source content
workers/report/ Cloudflare Worker: the "report an issue" relay (its own README)
docs/           Brief, decisions, reports
```

## Content (adhkar data)

The app ships a prebuilt SQLite database: `assets/db/content.db`. JSON is never parsed at runtime.

```
content-source/
  adhkar.json           Copy of rn0x/Adhkar-json (never edit it)
  source.json           Where it came from (repo, commit, license note)
  overrides.json        EVERY change we make: category splits, count fixes, text fixes
  audio-manifest.json   Size + SHA-256 of every hosted mp3
  content-lock.json     Version + fingerprint of the last build (generated)
```

To change content:

1. Edit `content-source/overrides.json` (never `adhkar.json`).
2. Bump `APP_CONFIG.content.version` in `src/config/app-config.ts`.
   The build refuses changed content with an old version, because devices would keep the old copy.
3. Run `npm run content:build`. It rewrites `assets/db/content.db`, the lock file and
   [docs/content-changes.md](docs/content-changes.md) (the list of every change, generated).
4. Commit all of them. `npm run verify` fails if any of them is out of date.
5. For a development build, restart Metro with `npx expo start --dev-client --clear`: Metro can
   keep serving the old `content.db` from its cache. If the app reloads after step 2 but before
   step 3, it copies the old file under the new name; the version check rejects it, and the next
   start (after the new build) copies the right file again.

If the audio files change: `node scripts/content/make-audio-manifest.ts <audio-folder> ar`.

Three rules in `overrides.json` change the whole content: `removeQuoteMarks` drops the book's
(( )) (see `scripts/content/lib/quote-marks.ts`), `lineBreaks` puts each part of a long dhikr on
its own line (`line-breaks.ts`), and `addedAdhkar` adds the owner's own adhkar (positions 900+,
e.g. 1901 first in the morning).

`audioRepeats` says how many times a recording says its dhikr, by audio file name (not listed:
once). The reader then plays it count ÷ that number times, and with "العدّ مع الصوت" each play
counts that many. The build fails if a dhikr using the file has a count it does not divide
evenly; a test on the shipped database checks the same. Example: if the recording of
سبحان الله وبحمده (dhikr 1017, count 100, file `91` per `npm run db:peek -- 1017`) said it 4
times, `"files": { "91": 4 }` would make it play 25 times.

Text rules:

- Display text keeps its tashkeel exactly as in the source. Only PDF "letter-shape" characters
  are replaced by normal letters (`cleanDisplayText`).
- Search uses a hidden `SearchText` column: no tashkeel, folded letters (أ/إ/آ→ا, ة→ه, ى→ي, …),
  no punctuation (`toSearchText`). The same function normalizes the user's query.
- Dhikr ids are stable: `categoryId * 1000 + position in the source category`.

Items waiting for a decision are in [docs/content-review.md](docs/content-review.md).

### Sources and fadl (Dorar)

`content-source/dorar-sources.json` holds what was found on الموسوعة الحديثية (dorar.net), copied
word for word: per dhikr the narration text, narrator, scholar, book, number, grading and link.
The rules are in [docs/decisions.md](docs/decisions.md) ("Sources from Dorar").

- The content build checks the file (known dhikr ids, dorar.net links, every fadl and Dorar
  wording is an exact quote from its Dorar text) and writes the `DhikrSources` table.
  Only `matched` entries ship (`none` = the owner chose no source). A fadl ships only with
  `approved: true`; a fadl with `by: "owner"` is the owner's own words and is not checked
  against Dorar. A wording proposal with `approved: true` replaces the words in that dhikr.
- [docs/sources-review.md](docs/sources-review.md) is generated from it: fadl (F) and wording (W)
  waiting for approval, items waiting for a decision (R, with options), the fadl and wording in
  the app, the adhkar without a source, and every shipped source.
- To change a source or fadl later, use the tools in [scripts/dorar/](scripts/dorar/README.md)
  (`npm run dorar:apply`): they copy every field from a saved Dorar page. Words the owner gives
  for one category only go into `overrides.json` as `textFixes` of that split part. Then bump
  the content version and run `npm run content:build`.

## Data layer (app)

Two SQLite databases, opened at start by `src/data/db/open-databases.ts`:

| Database          | What                                                                                                | Lifetime                                                                                                                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `content-v{N}.db` | Copy of `assets/db/content.db`. Read-only.                                                          | Replaced when `APP_CONFIG.content.version` goes up (a new file per version; old ones are deleted). A damaged or cut-short copy is detected (`PRAGMA quick_check` + version) and copied again. |
| `user.db`         | Favorites, custom order, settings, downloaded-audio registry, the user's own categories and adhkar. | Never replaced. Changed only through migrations in `src/data/db/user-schema.ts` (add a new entry, never edit a shipped one).                                                                  |

- Repositories (`src/data/repositories/`) are the only code that runs SQL. Screens use them via
  `useRepositories()`; settings via `useSettings()`.
- Repositories depend on the small `SqlDatabase` interface (`src/data/db/sql.ts`). The app uses
  expo-sqlite; tests use Node's built-in SQLite, so tests run the real SQL and FTS5 queries —
  including against the shipped `content.db`.
- Dhikr counters are in memory only (`src/features/counter/counter-store.ts`). Leaving the reader
  resets that category's counters (so it starts from zero next time), and all reset when the app
  closes. The reader's "إتمام" button fills the current dhikr's count and moves on.
- **Continue where I stopped** (setting, on by default): when the app goes to the background in
  the reader, the place and the counts are saved in `user.db` (`SavedSession`,
  `SessionRepository`). A fresh app start within 5 hours reopens the reader there
  (`src/features/session/useSessionRestore.ts`, run by the Home screen) and shows a toast
  (`src/components/Toast.tsx`, one `ToastProvider` for the app).
- App code must not import `node:*` modules, `src/test-utils` or `scripts/` (enforced by ESLint).

## The user's own adhkar ("أذكاري")

Users can add their own categories and adhkar. They show in the "أذكاري" section on Home, below
the favorites, in a sand color (`customSurface`, `customBorder`, `customAccent` in
`src/theme/colors.ts`).

- Stored in `user.db` (`CustomCategories`, `CustomAdhkar`), through `CustomRepository`
  (`src/data/repositories/custom-repository.ts`). Content updates never touch them.
- **Ids are negative** (`src/data/custom-ids.ts`): row 5 is id `-5`. So one id space works for
  routes (`/category/-5`), counters and favorites, and never clashes with content ids.
- They use the same reader, counter, favorites, search and completion screen as the book.
- Optional audio is recorded in the app or picked from a file, then copied to the app's own
  folder `custom-audio/` (`src/features/custom/custom-audio.ts`). Files are deleted when the
  dhikr or category is deleted or the audio is replaced.
- Screens are in `src/features/custom/`; routes in `src/app/custom/`.

## Audio (recitations)

The recordings are hosted in the public repo **`wirduk-audio`** and served by GitHub Pages:
`https://tameemhabash.github.io/wirduk-audio/audio/<lang>/<file>.mp3` (base URL in
`src/config/app-config.ts`). The same site has the privacy policy at `/privacy/`.

- **First play** of a dhikr downloads that one file, then it always plays from the phone.
  The play button shows a spinner while it downloads; a second tap cancels.
- **Settings → الصوت → تحميل كل الصوتيات** downloads every file of the app language (267 files,
  ≈116 MB): the size is shown first, then a progress bar and "stop". Starting again continues where
  it stopped. The same screen deletes the downloads (the user's own recordings are never touched).
- **Repeat**: a recording plays as many times as the dhikr's count (100 times for
  سبحان الله وبحمده), with "التكرار 3 من 100" under the position.
- **العدّ مع الصوت** (off by default): each finished play counts once; the recording plays only
  the times still left; at the count the reader moves on and the next dhikr plays. Off: only taps
  count.
- **Autoplay** (on by default): after the last repeat, the reader moves to the next dhikr and
  plays it. **Background playback** (on by default): keeps playing with the screen off, with
  lock-screen controls; when off, audio pauses when the app leaves the screen.
- Code in `src/features/audio/`:
  - `audio-downloads.ts` — the download manager (no React Native imports, tested in Node with a fake
    storage). A file counts as downloaded only if it is on the phone **with its full size** (sizes come
    from `content-source/audio-manifest.json` via the content database); a wrong size (an error
    page, a cut file) is deleted. Errors are `offline`, `storage` or `failed`, each with a clear message.
  - `expo-audio-storage.ts` — files in `<documents>/audio/<lang>/`; a download is written to
    `<file>.mp3.part` and renamed only when complete.
  - `AudioProvider.tsx` — one manager for the app, so "download all" keeps going between screens.
  - `useDhikrAudio.ts` — the reader's player (play/pause, autoplay, background, lock screen).

The audio repo is checked out next to this one, at `../wirduk-audio`.
To publish changed audio: put the files in the `wirduk-audio` repo under `audio/<lang>/`, run
`node scripts/content/make-audio-manifest.ts <that folder> <lang>`, then `npm run content:build`
(with a content version bump).

## Sounds and vibration

| Setting                              | Default | What                                                                    |
| ------------------------------------ | ------- | ----------------------------------------------------------------------- |
| الاهتزاز الخفيف عند كل عدّة          | on      | A light tap on each count (`expo-haptics`).                             |
| اهتزاز عند الانتقال إلى الذكر التالي | on      | 200 ms when the reader moves on to the next dhikr.                      |
| اهتزاز طويل عند إتمام الباب          | on      | One 600 ms vibration when the whole category is done.                   |
| صوت خفيف عند كل عدّة                 | off     | `assets/sounds/tick.wav` on each count. See `assets/sounds/SOURCES.md`. |

## Reminders

Settings → "التذكير": morning (6:00 ص) and evening (5:00 م), each with a switch and a time, both
**off** by default. They are daily **local** notifications (`expo-notifications`): no push, no
server. The notification permission is asked when a reminder is turned on. A tap opens the morning
(1) or evening (133) adhkar. Android may deliver them a little late (no exact-alarm permission).
Code: `src/features/reminders/`. The status-bar icon `assets/notification-icon.png` is made by
`npm run branding:build`. With «أدومها» on, the reminders move into its Settings section and
open the ward.

## «أدومها» (Adwamuha): a small ward that grows

A habit plan for the morning and evening adhkar (the owner's description:
[docs/adwamuha/feature-prompt.md](docs/adwamuha/feature-prompt.md); decisions in
[docs/decisions.md](docs/decisions.md)). The user starts with one dhikr in the morning and one
in the evening (after the opening dhikr), and adds the next one only after 4 of 7 days, for the
step's weeks. 24 steps in 4 stages lead to the full morning and evening adhkar.

- **Turn on:** Settings → «أدومها» (first section). The start screen explains the idea, shows
  the light-plan notice with its hadith, and lets the user start at a later step.
- **Home:** the «وردك اليوم» card: the ward that can count now, today's state, the step.
  «مساري» shows the path, the percentages, the last 7 days, the stage's tip.
- **Counting:** a ward counts in its own window (times in Settings); after the on-time end it
  counts as "late". The whole morning or evening category counts too. «قرأتُها من حفظي» for
  today or yesterday. Breaks and days with the feature off count for nothing. A ward that was
  already over when the plan or a step began is not counted.
- **Never automatic:** «جاهز لإضافة الذكر التالي؟» waits for the user; a step that is not ready
  gets more weeks, without blame. «طرأ عليّ ظرف» steps back or takes a break.
- **Messages:** at the owner's moments (a ward done, end of a week, a new step…) one message:
  the owner's own words or an approved verse / hadith from `content-source/adwamuha-messages.json`
  (verses from Tanzil, hadiths from Dorar; `scripts/adwamuha/messages.ts`).
- **Data:** only on the phone (user.db): the user's own copy of the plan, the state, the day
  records, the breaks. The default plan is in the content database
  (`content-source/adwamuha-plan.json`).

Code: `src/features/adwamuha/` (pure logic in `logic/`), routes in `src/app/adwamuha/`.

## Backup

Two kinds (owner, 2026-10-25), no sign-in and no server of ours:

- **A backup file** (Settings → «النسخ الاحتياطي»): «حفظ نسخة احتياطية» makes
  `wirduk-backup-YYYY-MM-DD.wirduk` and opens the share sheet (Google Drive, Files, WhatsApp…).
  The file is a SQLite database: a `VACUUM INTO` copy of `user.db` plus `BackupMeta` (app,
  format, date) and `BackupRecordings` (the user's own recordings as BLOBs); downloaded audio
  and the reader's last session stay out. «استعادة نسخة احتياطية» picks a file, checks it (not a
  backup / from a newer app / damaged), brings an older one up to date with the usual
  migrations, shows what is inside, keeps a safety copy (`SQLite/user-before-restore.db`), then
  replaces the data in one transaction and starts the app again. Core: `src/data/backup/`;
  files and share sheet: `src/features/backup/backup-files.ts`.
- **Android's automatic backup** to the user's own Google Drive: rules keep only `user.db` and
  the backup date (never audio or the content database: Android skips everything above 25 MB).
  A backup agent (`modules/wirduk-backup`, set by `plugins/with-backup-agent.js`) records each
  backup's date; Settings shows it, and Home shows a gentle note after 30 days with no backup of
  either kind. Moving to a new phone by cable or Wi-Fi also carries the user's recordings.

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

## Report an issue

Settings → الدعم → "الإبلاغ عن مشكلة": a description, up to 4 screenshots (made smaller in the
app) and the app/device details, all shown before sending. The app posts it to a small relay
(`workers/report/`, a Cloudflare Worker) that opens an issue in a private GitHub repo. The row
shows only when `APP_CONFIG.report.endpoint` is set; deploy steps are in
`workers/report/README.md`.

## Logo, icons and splash

The design files are in `wirduk-logo/` (light and dark SVG, plus PDF, EPS and PNG).
`npm run branding:build` turns the SVGs into every image the app uses:

| File                                                         | Use                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------- |
| `assets/branding/logo-{light,dark}.png`, `…-small.png`       | Logo inside the app (`src/components/Logo.tsx` picks light or dark) |
| `assets/icon.png`                                            | App icon (iOS and fallback): full square                            |
| `assets/android-icon-{background,foreground,monochrome}.png` | Android adaptive icon and themed (one-color) icon                   |
| `assets/splash-icon.png`, `assets/splash-icon-dark.png`      | Splash screen (set in `app.config.ts`)                              |

After a logo change: run the script, check the images, then rebuild the native app
(`npx expo prebuild --clean` + `npm run android`).

## Fonts

All fonts are embedded at build time (`expo-font` plugin in `app.config.ts`) and listed in
`src/theme/fonts.ts`. File name = PostScript name, so one `fontFamily` works on Android and iOS.
All are SIL OFL-1.1; sources and SHA-256 hashes are in `assets/fonts/SOURCES.md`.

- UI: IBM Plex Sans Arabic (Regular, Medium, SemiBold). Use the family per weight, not `fontWeight`.
- Dhikr: Amiri Quran (default), Amiri, Scheherazade New, Noto Naskh Arabic — each with its own
  line height so tashkeel never touches the next line.
- KFGQPC Uthmanic Hafs is **not** included: its license requires written approval from the
  King Fahd Complex.

Adding a font: put the `.ttf` and its `OFL-<Family>.txt` in `assets/fonts/…`, add it to
`FONT_FILES` / `DHIKR_FONTS`, add its name to the strings, then rebuild the native app.

## Tests

Two Jest projects (see `jest.config.js`):

- **logic** — plain TypeScript, runs in Node (`*.test.ts`).
- **ui** — screens and components with Testing Library (`*.test.tsx`). They render with the
  **real** repositories: the shipped `content.db` plus a fresh in-memory user database
  (`src/test-utils/render-app.tsx`). Native-only modules are mocked in `jest.setup.ui.ts`.
  In Testing Library 14, `render` and `fireEvent` are async: always `await` them.
  Audio, recording, the file picker and the router are mocked with call records in
  `src/test-utils/` (`audio-mock.ts`, `router-mock.ts`).
- Lists render more rows on their own 50 ms timer. If a test changes a list's data at its end
  (for example adds a favorite), finish with `await settleLists()`, or React may warn about an
  update outside `act()`.

Touch, swipe, drag, vibration and font rendering need a device: see
[docs/manual-test-checklist.md](docs/manual-test-checklist.md).

## Develop with Claude Code

The project is built with [Claude Code](https://claude.com/claude-code). `CLAUDE.md` holds the working
notes it reads first (rules, commands, traps); `docs/status.md` says where things stand and what
comes next; `docs/decisions.md` explains why. To work on a fork: follow "Setup" above, run
`npm run verify`, then ask Claude Code for the next step. The audio site and the privacy page are in
the separate repo `TameemHabash/wirduk-audio`. The history before the public start (and the raw
Dorar research) is in a private archive.

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
