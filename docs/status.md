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
| RF4 | Refactor: split the big files («أدومها» provider, reader, plan editor, editors) | Not started | |
| RF5 | Refactor: speed («الأذكار» tab, reader, «أدومها» context, audio progress, shared loads) | Not started | |
| RF6 | Refactor: better tests (test kit, behavior tests, «أدومها» timeline tests, e2e flows) | Not started | |
| RF7 | Refactor: Claude Code setup and docs (CLAUDE.md, .claude/, architecture doc) | Not started | |
| RF8 | Refactor: full check and report (all tests, e2e, pictures compared, speed) | Not started | |
| 14 | Google Play (waits for the redesign) | Not started | |
| 15 | App Store (iOS) | Not started | |

The commit ids above (and any from before 2026-11-01) are in the private archive
`TameemHabash/wirduk-archive`. The public `wirduk` starts with one clean commit.

## Refactor (RF0–RF8, from 2026-11-27)

The owner asked for a full refactor before Google Play (2026-11-27): a known Expo structure,
clean code, better tests, speed, a clean repo, a simple Claude Code setup, and **nothing the
user sees changes**. The plan: `.claude/plans` on the owner's PC; the owner's answers: feature folders,
Maestro, delete the old files, and keep the user's data (decided in RF2; `docs/decisions.md`).

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
  step-back sheet (corners, dimming, grab line differ), and the reorder row. The other loads do
  more than load (a delay while typing, a refresh on return, saving a date) and stay.

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
    (CLAUDE.md, "Phone"). On the link since 2026-11-26: the APK of e3b69e2 (the whole redesign,
    R1–R6; kept in `.local/apk/`).
  - The next APK installs over the old one: the data is kept (decisions, 2026-11-27). Before
    Google Play: the Play build is signed with another key, so testers uninstall then (a backup
    file keeps their data).
- **Tests:** 845 (Jest: logic + ui, and the relay in `workers/`). `npm run verify` passes.
- **user.db:** schema 7 (6: `WardProgress`, the day's ward read in parts, 2026-11-14; 7:
  `AdwamuhaMessagePicks`, the message each ward got, 2026-11-21).

## Waiting for the owner

- **The redesign (R1–R6, 2026-11-26)**: built and checked on the emulator; the owner checks it
  all together (owner, 2026-11-26), on the phone with the APK of e3b69e2 (on the link).
  Claude's choices to confirm: the rules around «لم أقطعها بعد» (below), and the reader ring is teal as in
  the design (it was gold).
  - «لم أقطعها بعد» is not on the finished path;
    «تغيير الترتيب» waits until a step put back is saved; a step put back needs its full weeks
    when reached again (not the one week of a climb back).
- **The owner feedback of 2026-11-21** (`docs/decisions.md`): to check on the phone with the
  APK of e3b69e2 (on the link). The 2026-11-14 changes: tested by the owner (2026-11-21).
- **The owner feedback of 2026-11-22** («قطعتها», `docs/decisions.md`): on the link (APK of e3b69e2), to check
  on the phone. Claude's choices to confirm: «قطعتها» on later steps too, the last step cannot be
  marked, reset keeps the steps done, the intro line.
- **The owner feedback of 2026-11-22 (2)** («ارجع إلى الخطوة:», `docs/decisions.md`): built as the approved
  design; on the link (APK of e3b69e2), to check on the phone.
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
