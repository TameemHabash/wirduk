# Project status and next steps

Last updated: 2026-11-27. Read this first when you come back to the project.
Rules and traps for working on it are in [../CLAUDE.md](../CLAUDE.md). The owner's decisions are
in [decisions.md](decisions.md). The story of each milestone is in git (`git log`), and before
2026-11-01 in the private archive `TameemHabash/wirduk-archive`.

## Milestones

| # | Milestone | Status | Main commits |
|---|---|---|---|
| 0 | Tools and setup (Node 24, JDK 17, Android SDK, emulator `Wirdak_Pixel`) | 🟢 Done | — |
| 1 | Project skeleton | 🟢 Done | c6c8128 |
| 2 | Content pipeline (JSON → prebuilt SQLite, overrides, change log) | 🟢 Done | 21ebd66, 494704e |
| 3 | Data layer (repositories, user.db migrations, FTS search) | 🟢 Done | e3f3b5e |
| 4 | Design direction ("paper and ink"; replaced by the redesign R1–R6) | 🟢 Done | 8e17a54, bf6e03d |
| 5 | Core screens (home, reader, completion, search, settings, about) | 🟢 Done | 8f34aaf |
| 6 | Fonts (checked on device at size 40) | 🟢 Done | 5508ce3 |
| — | Extras: rename to Wirduk, long vibration, tick sound, own adhkar, new logo, icon, splash | 🟢 Done | ff76f70, e1d18fb, 391994d, e83040a |
| 7 | Audio (download on first play, download all, background, autoplay), audio site, privacy page | 🟢 Done | 8dca414, 515e6a3 |
| 8 | Dorar sources and fadl, evening wording | 🟢 Done | 3c988f3, 6862e15, f163449, 365a40a |
| — | Owner feedback 2026-10-22: opening dhikr, no (( )), next-dhikr vibration, keep screen on, rotation, Dorar toast, louder tick, continue where I stopped, screen-off audio fix | 🟢 Done | eb4bb02 |
| 9 | Notifications, report an issue (relay live, privacy page updated) | 🟢 Done | 75e9a3f, e066c44 |
| — | After 9: Dorar line in About, report details (screen, text size, free storage), button fix (reports#2), times said per recording (content v9) | 🟢 Done | 4ef0960, f09d878, f6ec1bc, 960cd6d |
| 10 | Adwamuha (the owner's big feature) | 🟢 Done | c2323c3, 6e451cb, b8ca3eb, 37a51e6, b6bcf7c, ff811f6 |
| 10b | Adwamuha redesign (the owner's design, 2026-10-29) and fixes | 🟢 Done | ed0e696, 6d1bf0c, 1565c43, cf5d7df, 92e45d8, 9486b84, 870fa9b |
| 10c | Owner feedback 2026-10-30: setup in 4 screens (ward order), whole-ward previews with two names, ward order section in settings, «غير مفعّلة», the splash in the APK | 🟢 Done | d6f05f4 |
| 10d | «بداية الأسبوع» (the owner's design, 2026-10-30): a setting, not the phone's region | 🟢 Done | 930bc0c |
| 10e | Owner feedback 2026-10-30 (2): «مساري» goal line; audio download of the morning and evening only | 🟢 Done | one commit, 2026-10-30 |
| 11 | Update the morning and evening recordings (the owner's 30 m4a files, content v13) | 🟢 Done | 40ebb84, 3217fe5; wirduk-audio 30d2cc7 |
| — | After 11: the audio that does not count waits for the user's count; «العدّ مع الصوت» on by default | 🟢 Done | 0370843, one commit 2026-10-31 |
| 12 | Backup: Android's automatic backup fixed + a backup file (save, restore) | 🟢 Done | 45ccb23, 4eb9e45, 050538f |
| 13 | Quality and edge cases (every «أدومها» state tested, dev clock, cleanup, edge cases, the owner's phone) | 🟢 Done | 2d49084, 698aff6, 9373c31, 68a8074 |
| — | Owner feedback 2026-11-01: «مساري»'s dot drawn square after «قرأتها من حفظي» (Galaxy only); "continue where I stopped" after the audio played (the process kept); the second ward's finish screen like the first (option ب) | 🟢 Done | 63091f6, ae60182, one commit 2026-11-01 |
| — | Owner feedback 2026-11-14: a reminder tap checks the ward first; the ward read in parts (kept for its window); the «أدومها» badge on Home while off; the good-weeks rule (a week counts once it is over), the goal bars always shown | 🟢 Done | 907c445, one commit 2026-11-15 |
| — | Owner feedback 2026-11-21: no message repeats before all of its kind were shown (after a ward and on Home); a ward never opens outside its time (also from a reminder); Home's messages back as before | 🟢 Done | 4e6afd0, one commit 2026-11-21 |
| — | Owner feedback 2026-11-22 («عدّل الخطة»): «قطعتها» marks a step as passed (saved after the warning); steps 4 and 5 by the owner's names | 🟢 Done | b106530, be45c3f |
| — | Owner feedback 2026-11-22 (2) («طرأ عليّ ظرف»): «ارجع إلى الخطوة:», a step picked with − and + (design approved first) | 🟢 Done | one commit 2026-11-22 |
| R1 | Redesign: the look (colors, icons, buttons, rows, the in-app dialog, the toast, the ring) | 🟢 Done | one commit 2026-11-26 |
| R2 | Redesign: three tabs, Home, the Adhkar tab (search, reorder), own adhkar editors | 🟢 Done | one commit 2026-11-26 |
| R3 | Redesign: the reader (fadl, «المصدر», long text), the restore toast, the finish screen | 🟢 Done | one commit 2026-11-26 |
| R4 | Redesign: «أدومها» (setup, «مساري» beads, step-back sheet, «لم أقطعها بعد», settings) | 🟢 Done | one commit 2026-11-26 |
| R5 | Redesign: Settings (notifications card) and the other screens | 🟢 Done | one commit 2026-11-26 |
| R6 | Redesign: checks (contrast, dark mode, largest font, emulator pass of every screen) | 🟢 Done | one commit 2026-11-26 |
| RF0 | Refactor: safety net (Maestro screen runs, baseline pictures, coverage and speed numbers) | 🟢 Done | one commit 2026-11-27 |
| RF1 | Refactor: clean the repo and the PC (old files, history docs, stale references) | 🟢 Done | one commit 2026-11-27 |
| RF2 | Refactor: the data (kept, not reset: Android's backup would bring old data back; stale comments) | 🟢 Done | one commit 2026-11-27 |
| RF3 | Refactor: the new structure (feature folders, shared UI kit, layer rules) | 🟢 Done | two commits 2026-11-27 |
| RF4 | Refactor: split the big files («أدومها» provider, reader, plan editor, editors) | 🟢 Done | one commit 2026-11-27 |
| RF5 | Refactor: speed («الأذكار» tab, reader, «أدومها» context, audio progress, shared loads) | 🟢 Done | one commit 2026-11-27 |
| RF6 | Refactor: better tests (test kit, behavior tests, «أدومها» timeline tests, e2e flows) | 🟢 Done | one commit 2026-11-27 |
| RF7 | Refactor: Claude Code setup and docs (CLAUDE.md, .claude/, architecture doc) | 🟢 Done | one commit 2026-11-27 |
| RF8 | Refactor: full check and report (all tests, e2e, pictures compared, speed) | 🟢 Done | one commit 2026-11-27 |
| — | Owner decisions after RF8 (2026-11-27): 11 Expo packages updated; the notifications card only after the app asked; no «جاهز لإضافة الذكر التالي؟» during a break; then the APK | 🟢 Done | one commit 2026-11-27 |
| — | Owner feedback 2026-11-27 (2): a tap on the «المصدر» row in the reader no longer counts (what it shows inside still counts) | 🟢 Done | one commit 2026-11-27 |
| — | Owner feedback 2026-11-27 (2): Home crashed when the phone's date went back before the «أدومها» step's start | 🟢 Done | one commit 2026-11-27 |
| — | Owner feedback 2026-11-27 (2): an unlimited count for own adhkar, «بلا حد» (design option ب) | 🟢 Done | one commit 2026-11-27 |
| 14 | Google Play (waits for the redesign) | Not started | |
| 15 | App Store (iOS) | Not started | |

The commit ids above (and any from before 2026-11-01) are in the private archive
`TameemHabash/wirduk-archive`. The public `wirduk` starts with one clean commit.

## Refactor (RF0–RF8, from 2026-11-27)

The owner asked for a full refactor before Google Play (2026-11-27): a known Expo structure,
clean code, better tests, speed, a clean repo, a simple Claude Code setup, and **nothing the
user sees changes**. The owner's answers: feature folders, Maestro, delete the old files, and keep
the user's data (decided in RF2; `docs/decisions.md`).

**The refactor is done (RF0–RF8, 2026-11-27).** What waits for the owner: "Waiting for the
owner" below. Then milestone 14 (Google Play).

RF0, done (2026-11-27):

- Maestro 2.12.1 (in `%USERPROFILE%\.maestro`, analytics off). `e2e/shots.yaml` visits every
  screen from a clean install on a release x86_64 build, in a fixed state (date 2026-11-27
  09:00, quiet status bar, light, font 1.0); `scripts/dev/e2e.ps1` runs it,
  `scripts/dev/compare-shots.ts` compares two runs and lists only the changed screens. Flows
  find text by its key (`scripts/dev/e2e-strings.ts`): no typed Arabic.
- Baseline of commit 22803cf: 49 screens in light, dark and font 1.3 (`.local/shots/baseline/`,
  `-dark/`, `-big/`, not in git). Two runs of the same code give the same pictures (48 of 49;
  the message after a ward is random by design: `e2e/shots-compare.json`).
- `.local/baseline.md`: 845 tests, coverage statements 89.0%, branches 82.4%, functions 86.9%,
  lines 91.1%; cold start median 609 ms; reader swipes 11.2% janky frames (emulator).
- Found: a link to the reader already open (`wirduk://category/1?dhikr=1002` while category 1
  is open) kept the page it was on. The owner said fix it (2026-11-27): the reader now goes to
  the link's dhikr (`ReaderScreen.tsx`, also the «أدومها» ward), and the param is cleared after
  use, so the same link works again.
- Owner (2026-11-27): the «الأذكار» tab is slow to open since the redesign: fix it in RF5. Likely
  cause: it draws all 131 chapters at once (a plain `ScrollView`, an SVG star per row), and
  reloads them on every visit with new objects, so every row draws again.

RF1, done (2026-11-27):

- Deleted old files (in git history): `docs/screenshots/`, `docs/design/proposal.html`,
  `docs/app-summary.md`, `docs/adwamuha/plan.md`, `matching.md` (`match-plan.ts --out` makes it
  again), `texts-for-review.md`, `scripts/dev/wav-level.ts`, and the logo's PDF, EPS and PNG
  copies (the build uses only the two SVGs). Every mention fixed; `research/` (moved to the
  archive on 2026-11-01) left `tsconfig.json`, ESLint and Prettier.
- This file: only the current state (779 → about 170 lines). On the PC: about 750 MB of old
  files in `.local/` deleted (kept: the two newest APKs, `devices.md`, `redesign/`, the Dorar
  pages, `tanzil/`, the owner's chat texts, `keys/`), and the emulator's app data cleared.

RF2, done (2026-11-27):

- The plan was "start the data from zero" (one migration, content v1, testers uninstall). Found:
  Android's automatic backup saves `user.db` and puts it back on a new install, and `migrate()`
  refuses a database newer than the app, so testers' apps would not start. The owner chose to
  keep the data: the 7 migrations and content v13 stay, and so does the code that reads old
  stored data (`extraWeeks`, old event kinds).
- Stale comments fixed (`AdwamuhaProvider`: the step back, `savePlan`). The link fix (owner:
  "fix it", 782966d) was checked on the emulator in the screen run.

RF3, done (2026-11-27): the structure in `docs/architecture.md`.

- Feature folders (`screens/ components/ hooks/ logic/ state/ services/ __tests__/`), shared
  `components/ui|layout|navigation`, `hooks/`, `lib/`, `providers/AppProviders.tsx`. 164 files
  moved with their history (`git mv`); imports rewritten by a script.
- Layers: `data/` imports no feature («أدومها»'s shared types and defaults in
  `data/models/adwamuha.ts`, the ward-time check in `data/settings/ward-times.ts`); no import
  cycles. Both checked by lint (`import/no-cycle`, `no-restricted-imports` per layer).
- One copy each: `useAsync` (the plain loads, 6 places), the time picker (`lib/time-picker.ts`),
  the tone colors (`theme/tones.ts`), the morning/evening ids (`config/categories.ts`),
  `weekdayOf`. Repositories one class per file. The dev clock's logic is a screen of «أدومها».
- Kept as they are (a merge would change the look): the «قرأتُ وردي بدون التطبيق» sheet and the
  step-back sheet (corners, dimming, grab line differ; owner: keep them as they are), and the
  reorder row. The other loads do more than load (a delay while typing, a refresh on return,
  saving a date) and stay.

RF4, done (2026-11-27): the big files split by what they do.

- `AdwamuhaProvider` (704 → 288 lines, most of it the documented interface): `useAdwamuhaData`
  (read and reload), `useMessageLibrary` (texts, choosing a message), `useAdwamuhaActions`
  (everything that changes the plan), and Home's messages as a pure function
  (`logic/due-messages.ts`, tested).
- The reader: `components/Reader.tsx` (the reader, also used by the ward; the page moves and the
  screen-off rules kept together and unchanged), `screens/ReaderScreen.tsx` (loads a category),
  `ReaderHeader`, `EmptyCustomCategory`, and hooks `useAdvanceTimer`, `usePagerRebuild`,
  `useKeepScreenOn`, `useSaveReaderSession`.
- The plan editor: its edits as a tested reducer (`logic/plan-editor-state.ts`), `PlanStepCard`,
  `WeeksStepper`.
- Own adhkar: `useCustomActions` (delete a chapter or a dhikr with its recordings, favorite and
  counts). Five promises had no error handling (three loads, two deletes): an unreadable chapter
  or dhikr now shows as not found, a failed delete shows the error.
- Pure, tested: today's two wards (`logic/today-wards.ts`), the ward's adhkar in order
  (`wardAdhkar`). 870 tests.
- The screen runs: Gboard on the emulator began to show only a small floating bar (a Google-side
  change; Gboard itself was not updated), which Maestro cannot hide. The emulator now has
  `hw.keyboard=no` in its `config.ini` (Gboard shows its full keyboard; the PC's keyboard no
  longer types into the emulator window), and the flows wait for the keyboard before hiding it.

RF5, done (2026-11-27): speed. Rules for new code: `docs/architecture.md`, "Speed rules".

- «الأذكار» tab: a `FlatList` (only the rows near the screen; each row draws its part of the
  card, the same pixels), and one shared read of the chapters for Home, the tab and the reorder
  screen (`adhkar/state/CategoriesProvider.tsx`); a read that finds nothing changed keeps the
  same objects (`lib/keep-same.ts`), so the rows do not draw again on each visit.
- Reader: draws the pages near the current one (3 on each side; a page once drawn stays); a tap
  draws only the counter, the progress and «إتمام» (`useCount`, `useCompleteFlags`).
- «أدومها»: the actions never change (they read the latest data through a ref) and have their
  own context, with a small status context (`useAdwamuhaEnabled`, `useAdwamuhaStatusOptional`,
  `useAdwamuhaActionsOptional`): Home, Settings, the reader and the root providers (the
  reminders' sync) no longer draw again on every change of «أدومها»'s data.
- Audio "download all": the reader uses only the actions (`useAudioActions`); progress shown at
  most 4 times a second; the status is no longer read again from the phone for each file (the
  files done count at once, `withDownloaded`).
- Start: the two databases open side by side (one closed again if the other fails).
- Speed, release build on the emulator, before (71af701) → after, medians of 5:
  «الأذكار» tab first visit, tap to screen **327 → 139 ms** (JS before it 179 → 52 ms; its total
  JS in 2 s 183 → 237 ms, the list draws the other rows after the screen shows); a second
  visit's JS **77 → 14 ms**; opening the morning adhkar JS **150 → 80 ms**; reader swipes,
  janky frames **14.5% → 7.3%** (99th percentile 500 → 23 ms). 10 counting taps and the cold
  start: no clear change (the cold start moves between about 510 and 990 ms on the emulator).
  New tools: `Measure-E2eCpu`, `Measure-E2eLatency` (atrace, `scripts/dev/tap-trace.ts`).
- Screens: 48 of 48 the same as the baseline (03, 04, 20 included). The old code's own run
  showed screen 45 scrolled 44 px less (a drag that landed elsewhere, not a change).
- React Compiler: tried, left **off**. With it on, 12 «أدومها» scenario tests fail: «أدومها»
  reads the clock while drawing (`slot()`, `now()` in about 10 files), and the compiler keeps
  the first result, so "today" would stay stuck (in the app too). Turn it on only after "today"
  is state that changes (on return to the app, at the ward times); Jest then needs a
  transformer file that compiles only `src/` app code (inline options lose the `sources`
  function in Jest's workers). 174 functions compile today, 10 are skipped (try/finally and
  the like; skipped code simply runs as written).

RF6, done (2026-11-27): better tests. No app code changed (so no screen compare).

- Test kit in `src/test-utils/` (README, "Tests"): `givenAdwamuha`, `givenWardRead`,
  `givenDaysRead` (`given.ts`; the 11 copies of "turn on «أدومها»" are gone); `tr('key')`,
  `trPattern`, `trList` (`tr.ts`; 396 typed UI strings in 30 test files replaced by a script; the
  owner's words stay exact); `fixtures/content.ts` (named content ids, checked against
  `content.db`); `reader.tsx` (`openReader`, `openChapter`, `tapCounter`, `counted`, `position`);
  `app-state.ts`; `clock.ts`; and `mocks/` (audio, router, notifications, lists). The audio
  stand-in records what was heard (`recordingsHeard()`, `ticksHeard()`, `player.playing`); the
  router one runs a screen's unsaved-changes guard (`tryToLeave()`, `left`).
- Behavior, not call counts: the reader audio tests check the recordings heard, in order; the
  reminders what is scheduled; the editors what happens when the user leaves. Calls to native
  modules (keep awake, vibration, lock screen) stay: they are the app's outside edge. The colour,
  contrast and Galaxy layout guards stay. Long tests became one behavior per test.
- Split by what they test: `audio-screens` → `reader-audio`, `audio-settings`,
  `AudioDownloadsScreen`; `custom-screens` → `CategoryEditorScreen`, `DhikrEditorScreen`,
  `MyAdhkarScreen`, `custom-in-adhkar-tab`, `custom-in-reader`; `settings-reminders` →
  `AdwamuhaSettingsScreen`, `AdwamuhaSettings`, `ward-reminders`; `stepback-plan` → `step-back`,
  `PlanEditorScreen`; `reader-extras` → `reader-source`, `reader-vibration`, `reader-screen-off`,
  `useKeepScreenOn`, `useSaveReaderSession`; `user-repositories` → one file per repository.
- New tests: the app start (`open-databases.test.ts`: first install through a temporary file, a
  damaged copy, old versions, one database failing closes the other, a retry); leaving the
  editors and the reorder screen with unsaved changes.
- «أدومها» over time, three layers: (1) `states-doc.test.ts` checks `docs/adwamuha/states.md`
  (every state names a test, every file named exists, every scenario label is a test's title; it
  found 13 old file names and 4 labels); (2) the scenarios are day-by-day scripts
  (`s.play('days 2-27: both wards, app closed')`), and the rules for every day of a whole plan are
  in pure logic (`plan-walk`, now also a week's word every Friday): 34 s → 17 s; (3) the emulator
  timeline (`npm run e2e:timeline`, `scripts/dev/e2e-timeline.ps1`, ~30 min): a clean install,
  the emulator's date moved over 40 days, checks on day 1, the end of week 1, the 4th good week
  and «أبقِني أسبوعًا آخر», the question back 7 days later, «أضِف الذكر التالي», a break and its
  end, a step back, the ward read in parts, and the morning reminder tapped at 17:00. Days 1–39
  passed in one run; day 40 failed once (the flow force-stopped the app, which cancels its
  alarms: now it leaves with Home) and passed after the fix.
- Maestro flows with checks (`npm run e2e`, `e2e/flows/`): first run, a chapter read to its finish
  screen, own adhkar, continue where I stopped, a reminder and Android's question, «أدومها» set
  up and a ward read. All 6 pass from a clean install (~3 min).
- Numbers (RF0 → RF6): tests 845 → 1038; the whole Jest run 37 s → about 22 s (with
  coverage); coverage statements 89.0 → 90.1%, branches 82.4 → 83.0%, functions 86.9 → 88.4%,
  lines 91.1 → 92.2%. Jest now has a floor (90 / 82.5 / 88 / 92) and `npm run verify` runs with
  coverage, so a drop fails it.
- Found (old, not changed, the owner decides): on a fresh install (Android 13+), Settings shows
  the card «الإشعارات غير مسموحة» before the app ever asked. Android reports "denied" before the
  first question; the code meant "not yet asked does not count" (`useNotificationsDenied`). The
  baseline pictures of the old code show it too (22-settings-2).

RF7, done (2026-11-27): the Claude Code setup and the docs. No app code changed (two test
comments point to the new notes), so no screen compare.

- `CLAUDE.md` 305 → 146 lines: the owner's rules, the machine, commands, a short map, where new
  code goes, the traps of the whole app, tests. The rules of one area moved next to its code
  (they load when Claude works there): `src/data/CLAUDE.md` (SQLite traps, migrations, backup),
  `src/features/reader/CLAUDE.md` (screen off, pager width, focus reload, the process kept
  alive), `src/features/adwamuha/CLAUDE.md` (the owner's rules, generated texts, time,
  scenarios, dev clock), `scripts/CLAUDE.md` (content pipeline, Arabic text, Dorar, audio sheet),
  `e2e/CLAUDE.md` (Maestro, the emulator, release builds). Score with the claude-md-improver
  rubric (Claude's own scoring): 77/100 before (long, area rules in every session, a few stale
  lines) → 93/100 after. Every file and name in the notes was checked by a script.
- Found while checking: `node`, `npm`, `git` and `gh` are found without reloading the PATH (only
  Maestro is not; the `.ps1` scripts reload it themselves), so the PATH line is now only for
  those. `newAppStart` and `useReminderSync` run in `AppProviders` (the notes said the root
  layout). Five empty folders left by RF3 deleted (`src/features/counter`, `feedback`, `search`,
  `session`, `tabs`; not in git).
- `.claude/settings.json` (in git): the safe commands need no prompt (verify, jest, prettier
  check, git status/diff/log, db:peek, reading reports, read-only adb); `git push --all`,
  `--mirror` and `archive-main` to `origin` are denied. `.claude/settings.local.json` is ignored.
- A hook, `.claude/hooks/guard-git.mjs` (checks in `scripts/dev/git-guard.ts`, 45 tests), runs
  before every shell command: it blocks a commit message with a Co-Authored-By line, AI
  attribution or a BOM, and any push to `origin` but `main` (a tag only when its commit is on
  main, as `test-build`). It runs `node` directly, because Git Bash cannot start on this PC (the
  same EPERM as the Bash tool). Tested live: a dry-run commit with an attribution line was
  stopped.
- Skills in `.claude/skills/`: `/finish-milestone`, `/check-screens`, `/content-change`,
  `/phone-apk` (only when the owner asks).
- `AGENTS.md`: Expo's rules kept; fixed for this project (npm, `app.config.ts`, no Expo Go,
  local Gradle builds for testing and EAS for the stores). README 409 → 240 lines and current
  (it said «العدّ مع الصوت» is off by default, the step back had three kinds, «أذكاري» was on
  Home). `docs/architecture.md`: the features, the start and data flow, the providers in order,
  and how to add a screen, a feature, a migration, a setting, a string, a content change, a
  native module.

RF8, done (2026-11-27): the full check. One small app change (a log line, below).

- `npm run verify` passes: 1084 tests; coverage statements 90.1%, branches 83.2%, functions
  88.5%, lines 92.2% (RF0: 89.0 / 82.4 / 86.9 / 91.1).
- `npx expo-doctor`: 20 of 21 checks pass. 11 Expo packages are a few patch versions behind
  (expo 57.0.31 → 57.0.34, expo-router 57.0.29 → 57.0.32, expo-sqlite 57.0.4 → 57.0.7, …). Not
  changed in RF8: the check covers the refactor alone (Waiting for the owner).
- Release build: the 6 user flows pass (3.5 min). Every screen in light, dark and font 1.3
  compared with the baselines of the old code (22803cf): 48 of 48 the same in each (37 is random
  by design). In font 1.3, screen 24 differed in 0.09% of its pixels: only the edges cut at the
  top and bottom (a drag that landed a pixel or two apart). The old code's own run today had
  screens 22–24 about 30 px apart (the same: a drag, not a change).
- The «أدومها» timeline: the first run stopped on day 17. Home showed «تعذّر عرض الأذكار.» (the
  chapters' read failed; the retry button was there). The app never logged why, and 23 more
  starts in the same state did not show it again. The read is the same as before RF5. Change: a
  failed read now writes its error to the phone's log (`console.warn` in
  `adhkar/state/CategoriesProvider.tsx`, logcat `ReactNativeJS`; nothing on screen changes), and
  a test checks the error screen and its retry. The second run, with that build, passed all 40
  days (27 min) with no error in 70 app starts. If it shows again: `adb logcat -s ReactNativeJS`.
- Dev build: the dev clock (a filled week; «جاهز لإضافة الذكر التالي؟» with both answers after
  two good weeks; a week's break on «مساري») and the audio with the screen off (75 s: it kept
  playing and the reader moved from dhikr 1 to 3) work. Seen: during a break, a waiting
  «جاهز لإضافة الذكر التالي؟» stays on «مساري» (the rules did not change; Waiting for the owner).
- Speed: the old build (22803cf) and the new one measured one after the other on the same
  emulator (medians of 5; `.local/perf-*-old-22803cf.txt`, `-rf8.txt`, `-rf8b.txt`): «الأذكار»
  tab, tap to screen **416 → 119 / 159 ms**; JS before it 200 → 48 / 69 ms; a second visit's JS
  **82 → 18 ms**; opening the morning adhkar JS **190 → 100 / 110 ms**; the tab's JS in 2 s
  212 → 292 ms (the list draws its other rows after the screen shows, as in RF5); 10 counting
  taps JS 110 → 130 ms (2 ms a tap); reader swipes 7.1% janky frames for both today (RF5
  measured 14.5 → 7.3%; this number moves with the emulator); cold start 565 → 611 / 608 ms
  (one run moved between 505 and 1014 ms: not clear). The emulator was slower than in the
  morning (both builds' CPU numbers about 30–45% above RF5's).
- The emulator froze once (adb no answer, no CPU) and once quit with exit code 59 (GPU errors in
  its log); a restart fixed both (`e2e/CLAUDE.md`).
- A private report page for the owner with every screen before and after:
  https://claude.ai/artifact/8QMjco9DFQY45Uv5d2MjM3 (its files: `.local/rf8-report/`).
- `docs/refactor-plan.md` deleted (the refactor is done); the "one RF per session" lines left
  the `/finish-milestone` skill.

After RF8, the owner's decisions (2026-11-27, `docs/decisions.md`):

- The 11 Expo packages updated (`npx expo install --fix`; expo 57.0.34, expo-router 57.0.32,
  expo-sqlite 57.0.7, …), `npx expo prebuild`, a new release build. expo-sqlite 57.0.5 fixed
  a "database is locked" bug in transactions: maybe linked to RF8's one failed read on Home,
  maybe not (the log line will tell).
- The card «الإشعارات غير مسموحة»: Android 13+ says "denied" before the app ever asked, so it
  showed on a new install. Now `showNotificationsDenied` (`reminders/logic/`, tested): not
  allowed and (the app has asked — a new setting `notificationsAsked`, saved when a reminder is
  turned on or in the setup — or a reminder is on, or Android will not ask again). After a no,
  the card now shows at once (before: on the next visit).
- «جاهز لإضافة الذكر التالي؟» is hidden while a break goes on (`readyToMoveOn` in the
  provider, as the step-back suggestion already was), on Home and «مساري», and comes back when
  the break ends (a scenario test; a row in `docs/adwamuha/states.md`).
- Checks: 1097 tests; the 6 flows; every screen in light, dark and font 1.3: the same, except
  Settings 22–24 on a new install (the card is gone, the rows below move up; the owner's yes).
  Those three baselines were taken again (old ones in `.local/shots/baseline*-before-card-fix/`).
  The 40-day timeline passed (29 min), with no failed read in the phone's log.

Owner feedback 2026-11-27 (2) (`docs/decisions.md`):

- «المصدر» in the reader: a tap on its row (the word, the arrow, the two lines) only opens or
  closes it, open or closed, and never counts. Its own gesture keeps the reader's tap zone from
  getting the tap, so `SourceFold` just stopped calling the counter (`onSourcePress` removed).
  The source lines and «عرض في الدرر السنية» still count. Checked on the emulator (dev build,
  dhikr 1017): the row at the word and at both line ends, open and closed, kept the count; a tap
  on a source line and on the Dorar link each counted one. No screen compare: nothing drawn
  changed.
- An unlimited count for own adhkar: the owner asked for a small design first. Three options
  for the editor (a switch, two choices, an ∞ button), the reader (the number only, no «من N»;
  the ring empty, full after «إتمام»), the rules, the recording and the word:
  https://claude.ai/artifact/1E71SekjnQkGkY7csy4Ym1 (its file: `.local/unlimited-count-design.html`). The
  data needs a new column (migration 8): `CustomAdhkar.Count` has `CHECK (Count >= 1)`.
- Found, then fixed (owner: "fix it", next commit): **Home crashes when "today" is before the
  «أدومها» step's start** (`useProgress.ts`: `status.weeks[0]` is undefined, so
  `week.morning` throws). Seen on the emulator: the 40-day timeline left the plan starting
  2026-11-28 and the step on 2027-01-04, and the emulator's date was back on 2026-11-27. On a
  phone: a wrong date ahead (a new phone before the network time, a date changed by hand), then
  the right date again. The app does not open until that day comes. The emulator app's data was
  cleared to go on (a copy of that `user.db`: `.local/user-db-step-ahead/`).

The owner's answers (2026-11-27): the unlimited count as option ب, the recording option 1, the
word «بلا حد»; fix the crash; tests for both.

- The crash, fixed: `stepWeeks` (`logic/weeks.ts`) now always gives this week first, as its
  callers expect, even when the step's first day is after it (0 and 0, not full). Tests: a logic
  one (`weeks.test.ts`) and Home and «مساري» with the emulator's state (`progress-screens.test.tsx`,
  "the phone's date went back"); the 3 fail on the old code with the emulator's error. On the
  emulator, that `user.db` put back: Home shows «وردك اليوم» and «مساري» opens ("0 من 1", the
  week «—»). `docs/adwamuha/states.md`: the row "The phone's date moves back" names them.
- The unlimited count, «بلا حد» (design ب):
  - Data: user.db migration 8, `CustomAdhkar.Unlimited` (0 or 1). `Count` keeps the last
    number, so «عدد محدد» brings it back. Old own adhkar stay as they were (0). A backup is
    restored by column name after its own migrations, so old backup files still work.
    `Dhikr.unlimited` (always false for the book's adhkar).
  - Editor: «عدد المرات», then «عدد محدد | بلا حد» (the kit's `Segmented`) on the same row;
    + and − under them, at their end, only for «عدد محدد». A bad number left behind «بلا حد»
    does not stop the save: the old number is kept.
  - Reader: the counter takes the whole dhikr now (`tap(item)`, `complete(item)`). An
    unlimited one never completes from taps; «إتمام» marks it done (a `done` set in the store)
    and keeps its number. The counter: the number only (no «من N»), TalkBack «تم 12، بلا حد»;
    the ring empty, full after «إتمام». Its recording repeats until paused or «إتمام» (no
    «التكرار» line); with «العدّ مع الصوت» each play counts. "Continue where I stopped" saves
    the done ones (`done` in the saved session). The chapter's list: «× ∞».
  - A number of 4 digits or more gets a smaller font in the ring (`logic/count-font.ts`), so it
    stays inside it. Up to 999 nothing changes; the book's counts are at most 100.
  - New strings: `custom.countFixed` «عدد محدد», `custom.countUnlimited` «بلا حد»,
    `reader.counterUnlimited` «تم {{done}}، بلا حد».
  - Tests (26 new): the counter rules, the repository and migration 8, the saved session, the
    editor (choose, hide + and −, open on «بلا حد», the number back, a bad number behind,
    leaving asks), the reader (no «من», past the number, «إتمام», the finish, reset, continue
    where I stopped), the recording (repeats, «إتمام», pause, counting with the audio), the
    list badge, and the font size.
  - On the emulator (dev build, the schema-7 database from the timeline, so migration 8 ran on
    real data): the editor in both states, «× ∞» in the list, the reader with 12 taps (number
    only, ring empty), «إتمام» (grey, then the finish screen; with two adhkar, back on it: the
    ring full, the number kept).
  - No screen compare: the screens it changes (the dhikr editor's count, the reader of an own
    dhikr) are the new design; the rest draws as before.

## Where things are now

- **Content:** version **13** (`APP_CONFIG.content.version`; v9 added "times said per recording";
  v10 adds Adwamuha's default plan; v11 its message library; v12 its own messages and tips, table
  `AdwamuhaTexts`; v13 the owner's morning and evening recordings, m4a). 133 categories, 289 adhkar
  (287 from the book + the owner's opening dhikr in morning and evening). 270 adhkar have a
  Dorar source, 19 have none (17 by the owner's choice + the owner's own dhikr), nothing waits.
  11 fadl (6 Dorar quotes, 5 in the owner's words). The evening category uses evening words.
  The book's (( )) are removed, and each part of a long dhikr starts a new line.
- **GitHub:** `TameemHabash/wirduk` (**public** since 2026-11-01, this code, remote `origin`),
  `TameemHabash/wirduk-archive` (private, the history before that, remote `archive`, local
  branch `archive-main`) and `TameemHabash/wirduk-audio` (public, GitHub Pages: 397 mp3 +
  privacy policy at `/privacy/`), checked out at `D:\SelfProjects\wirduk-audio`.
- **Devices:**
  - Emulator `Wirdak_Pixel` (Android 16, x86_64, `google_apis`): the release x86_64 build for
    the Maestro runs (`e2e/README.md`); every run clears the app's data and sets the date. Signed
    in to the owner's Google account (for the backup screen). If it hangs on start ("Not
    Responding", no CPU): stop it, delete the `*.lock` files in its `.avd` folder, start it with
    `-no-snapshot-load`.
  - The owner's Galaxy S21+ (serial: `.local/devices.md`, Android 15, arm64) and a second
    Samsung phone: release builds from the fixed link
    https://github.com/TameemHabash/wirduk/releases/download/test-build/wirduk.apk (public
    pre-release `test-build`, owner's choice 2026-11-01), built with `scripts/dev/phone-apk.ps1`
    (the `/phone-apk` skill). On the link since 2026-11-27: the APK of 63bddc8 (the redesign
    R1–R6, the refactor RF0–RF8 and the owner's decisions after RF8; kept in `.local/apk/`).
  - The next APK installs over the old one: the data is kept (decisions, 2026-11-27). Before
    Google Play: the Play build is signed with another key, so testers uninstall then (a backup
    file keeps their data).
- **Tests:** 1127 (Jest: logic + ui, the scripts, and the relay in `workers/`), with a coverage floor;
  6 Maestro user flows (`npm run e2e`) and the «أدومها» timeline (`npm run e2e:timeline`).
  `npm run verify` passes.
- **user.db:** schema 8 (6: `WardProgress`, the day's ward read in parts, 2026-11-14; 7:
  `AdwamuhaMessagePicks`, the message each ward got, 2026-11-21; 8: `CustomAdhkar.Unlimited`,
  «بلا حد», 2026-11-27).

## Waiting for the owner

- **The owner feedback of 2026-11-27 (2)** («المصدر» does not count, the crash when the date
  went back, «بلا حد»): built and checked on the emulator; not on the link yet (the APK only
  when the owner asks). Claude's choices to confirm: a tap on a finished «بلا حد» dhikr does
  nothing (as with any finished dhikr; the reset button starts it again); a number of 4 digits
  or more gets a smaller font in the ring.
- **The refactor (RF0–RF8) and the decisions after RF8 (2026-11-27)**: on the link (APK of
  63bddc8), to check on the phone. Every screen was compared; the only visible change is the
  approved one: on a new install, Settings has no «الإشعارات غير مسموحة» card until the app has
  asked (it shows at once after a no). During a break, «جاهز لإضافة الذكر التالي؟» waits for the
  break's end.
- **The redesign (R1–R6, 2026-11-26)**: built and checked on the emulator; the owner checks it
  all together (owner, 2026-11-26), on the phone with the APK of 63bddc8 (on the link).
  Claude's choices to confirm: the rules around «لم أقطعها بعد» (below), and the reader ring is teal as in
  the design (it was gold).
  - «لم أقطعها بعد» is not on the finished path;
    «تغيير الترتيب» waits until a step put back is saved; a step put back needs its full weeks
    when reached again (not the one week of a climb back).
- **The owner feedback of 2026-11-21** (`docs/decisions.md`): to check on the phone with the
  APK of 63bddc8 (on the link). The 2026-11-14 changes: tested by the owner (2026-11-21).
- **The owner feedback of 2026-11-22** («قطعتها», `docs/decisions.md`): on the link (APK of 63bddc8), to check
  on the phone. Claude's choices to confirm: «قطعتها» on later steps too, the last step cannot be
  marked, reset keeps the steps done, the intro line.
- **The owner feedback of 2026-11-22 (2)** («ارجع إلى الخطوة:», `docs/decisions.md`): built as the approved
  design; on the link (APK of 63bddc8), to check on the phone.
- **The week rule** (2026-11-14: a step of N weeks needs N good weeks, 4 mornings and 4
  evenings each, not in a row) is Claude's advice, asked for by the owner: confirm or change it.

Not checked yet (from R6): the system font at 2.0 and the finish screen's animation on a
device. Setup 1–4 and the editors are now in the Maestro screen run (RF0).

## Milestone 14 — Google Play (after the owner finishes testing)

- EAS Build / Submit for an Android **AAB**, app signing by Google Play, `versionCode` handling.
  Run EAS as `npx eas-cli@latest <command>`.
- Remind the owner of the manual steps: Play developer account, first upload in the Play Console,
  store listing, privacy policy URL (`https://tameemhabash.github.io/wirduk-audio/privacy/`, or
  the new one in `wirduk` if the repo is public by then), Data safety (a report sends a
  description, screenshots and device details), content rating, and the closed-testing rule for
  new personal accounts (check the current rule).
- **Before publishing, remind the owner to confirm the rights to the audio recordings
  (reciter: حمد الدريهم).** The source repo's "free use" note may not cover them.

## Milestone 15 — App Store (iOS, last)

- Nothing has been tested on iOS yet. Needs: an Apple Developer account (owner, paid yearly),
  builds with EAS (no Mac here), and an iPhone or TestFlight for testing.
- Check on iOS: right-to-left layout, the fonts, background audio and lock screen, the microphone
  text, notifications (permission and tap), the time picker (iOS has no Android dialog), the
  report screen (picking screenshots), haptics, keep-awake, rotation.
- App Store Connect: listing, privacy "nutrition label" (same data as Google's Data safety),
  review rules for religious content and for the audio rights (same reminder as Google Play).
