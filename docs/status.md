# Project status and next steps

Last updated: 2026-11-01. Read this first when you come back to the project.
Rules and traps for working on it are in [../CLAUDE.md](../CLAUDE.md).

## Milestones

| # | Milestone | Status | Main commits |
|---|---|---|---|
| 0 | Tools and setup (Node 24, JDK 17, Android SDK, emulator `Wirdak_Pixel`) | 🟢 Done | — |
| 1 | Project skeleton | 🟢 Done | c6c8128 |
| 2 | Content pipeline (JSON → prebuilt SQLite, overrides, change log) | 🟢 Done | 21ebd66, 494704e |
| 3 | Data layer (repositories, user.db migrations, FTS search) | 🟢 Done | e3f3b5e |
| 4 | Design direction ("paper and ink", `docs/design/proposal.html`) | 🟢 Done | 8e17a54, bf6e03d |
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
| 14 | Google Play | Not started | |
| 15 | App Store (iOS) | Not started | |

The commit ids above (and any from before 2026-11-01) are in the private archive
`TameemHabash/wirduk-archive`. The public `wirduk` starts with one clean commit.

After milestone 8 (same day, from the owner's phone test): counts reset when leaving the reader,
an "إتمام" button, the editor's count box, audio that repeats as many times as the count, and the
"العدّ مع الصوت" setting (off by default then; on by default since 2026-10-31).

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
  - Emulator `Wirdak_Pixel` (Android 16, x86_64): dev build of 2026-10-31, content v13, signed
    in to the owner's Google account (for the backup screen). Its app data was empty on
    2026-11-01; «أدومها» set up again then, with test days from the dev clock. If it hangs on start
    ("Not Responding", no CPU): stop it, delete the `*.lock` files in its `.avd` folder, start it
    with `-no-snapshot-load`.
  - Owner's phone: Galaxy S21+ (serial: `.local/devices.md`, Android 15, arm64): release build of commit
    68a8074 (content v13), installed by the owner from the file, tested 2026-11-01. Update it with
    a release build (see CLAUDE.md, "Phone"); the APKs are in `.local/apk/`.
  - A second phone: the same APK (574d1b2), installed by the owner from the file (no USB).
    Newer APKs from this PC install over it (same debug key).
  - Before Google Play: the Play build is signed with another key, so testers must uninstall the
    test build first (their own adhkar and settings are lost, unless a backup feature exists).
- **Tests:** 730 (Jest: logic + ui, and the relay in `workers/`). `npm run verify` passes.

## Waiting for the owner

0. **Audio** for the new opening dhikr (1901/133901): the owner will send it, with the number of
   times each recording says its dhikr (`audioRepeats` in `overrides.json`, default 1).

1. **Evening audio** (`docs/content-review.md` §E): six evening adhkar show the evening words but
   play the morning recording. Per dhikr: keep it, or no audio in the evening.
2. **Recordings that already repeat**: some files may say the dhikr more than once (e.g. 2001,
   three surahs, count 3), so repeating them by the count may be too much. The owner listens and
   names any that should play once.
3. The manual checklist (`docs/manual-test-checklist.md`) has items without a date: not yet
   checked on a device (TalkBack, some own-adhkar steps, a few settings).
4. **«مساري»'s square dot** (fixed 2026-11-01, `WeekGrid.tsx`: a new view per status): only the
   owner's Galaxy showed it, so it needs a check there with the next APK.
5. **"Continue where I stopped" after the audio** (fixed 2026-11-01, `newAppStart()`): the owner
   checks it on both phones with the next APK (play the audio, swipe the app away, open it).

## Milestone 9 — notifications and "report an issue"

Built and tested on the emulator (2026-10-23); decisions in `docs/decisions.md` (2026-10-23).

**Reminders: done.** Settings → "التذكير", both off by default. Checked on the emulator: the
permission question, a reminder arriving, a tap opening the morning adhkar (app open and app
closed), refusing the permission (toast → the app's page in the phone settings).

**Report an issue: the app part and the relay code are done; the relay is not deployed.**
Checked on the emulator against a fake relay on this PC: description, 3 screenshots (62–83 KB
each after shrinking), details, the "no connection" message. The Settings row stays hidden
until `APP_CONFIG.report.endpoint` is set.

What is left, each step only with the owner's OK (details: `workers/report/README.md`):
1. ~~Create the private repo `TameemHabash/wirduk-reports`.~~ Done 2026-10-23 (default branch
   `master`, issues on).
2. ~~`npx wrangler@4 login` and `npx wrangler@4 deploy`.~~ Done 2026-10-23: the owner's account,
   workers.dev name `wirduk`, relay at **https://wirduk-report.wirduk.workers.dev** (answers
   `503 unavailable` until the token is set).
3. ~~The owner makes the fine-grained GitHub token and sets it as the secret `GITHUB_TOKEN`.~~
   Done 2026-10-23 (Cloudflare dashboard, type Secret; the token expires after about a year:
   then reports fail with "failed" until a new one is set, see `workers/report/README.md`).
4. ~~Set `APP_CONFIG.report.endpoint`, send a test report end to end.~~ Done 2026-10-23: issue #1
   in `wirduk-reports` (text, screenshot, details). The phones get it with the next release build.
5. ~~Privacy page: add the reminders and the report.~~ Done 2026-10-23 (`wirduk-audio` 85a4585,
   live at the same address). It stays in `wirduk-audio` (owner, 2026-11-01).
6. Google Play's Data safety form must declare what a report sends (milestone 14).

Open question for the owner: reminders may come up to an hour late (Android's battery window).
Exact timing needs the user to allow "Alarms & reminders" for the app (a system page), plus the
`SCHEDULE_EXACT_ALARM` permission.

## Going public (only when the owner says "make the repo public")

Decided 2026-10-23. **The owner gave the word on 2026-11-01**, with changes: the privacy page
stays in `wirduk-audio` and says nothing about the code (an organization may adopt the app and
make the repo private again, and Google Play needs that page); no "open source" box in the app
(the owner decides before Google Play, so skip steps 5a, 5b, 11, 12 and 13); the Tanzil text the
scripts read is kept in git (`.local/tanzil/`); a note for forks at the top of `CLAUDE.md`; README
"Develop with Claude Code" and "License". **All done on 2026-11-01**: steps 1–4 (serial in
`.local/devices.md`, `research/` removed, MIT `LICENSE`), step 6 (pushed, 42f9ac0 in the
archive), steps 7 and 8 by the owner (the auto-mode check blocks them for Claude), steps 5, 9
and 10 by Claude (one clean commit, the remotes, only `main` pushed, the checks) and step 14.
**`origin` is public: push only `main` to it, never `archive-main`** (`git push --all` or
`--mirror` would publish the old history).

- **Fresh start**: the public `wirduk` gets one clean first commit. The full history stays in a
  **private** archive. (Deleting files in a new commit is not enough: old commits keep them, and
  GitHub keeps old commits reachable by their id even after a history rewrite.)
- **Remove**: `research/` (the raw Dorar results of the first run; it stays in the archive) and
  the owner's phone serial.
- **Email**: keep the owner's personal email on commits (owner's choice).
- **License**: the code is open for anyone to fork, build apps with and reuse (owner's words):
  **MIT** for the code. Third-party parts keep their own terms, listed in the README: the adhkar
  text (`rn0x/Adhkar-json`, "no license, free to use"), the Dorar texts and links, the fonts
  (OFL-1.1), the tick sound (`assets/sounds/SOURCES.md`), the logo. The audio is not in this repo.

Steps:
1. Everything committed and pushed; `npm run verify` passes.
2. Phone serial: copy it to `.local/devices.md` (not in git). In `CLAUDE.md` and this file,
   write "the owner's phone (serial: `adb devices`, or `.local/devices.md`)". `git grep` for it
   must find nothing.
3. Remove `research/` from the tree. Fix what points to it: `CLAUDE.md`, `eslint.config.js`,
   `tsconfig.json`, `.prettierignore`, `scripts/dorar/README.md`. Say it lives in the private
   archive `TameemHabash/wirduk-archive`.
4. Add `LICENSE` (MIT, the owner's name, 2026) and a README "License" section with the
   third-party list above. Re-check each third-party term before writing it.
5. Docs: commit ids before the public start (in this file and `docs/decisions.md`) refer to
   `wirduk-archive`. "GitHub" line above: `wirduk` public, `wirduk-archive` private.
5a. **Privacy page moves into `wirduk`** (owner, 2026-10-23): copy `wirduk-audio/privacy/index.html`
   to `site/privacy/index.html`, add a GitHub Actions workflow that publishes only `site/` to
   GitHub Pages. New address: `https://tameemhabash.github.io/wirduk/privacy/`. Its contact link
   points to the `wirduk` issues. `APP_CONFIG.privacyPolicyUrl` → the new address.
5b. **About screen: "open source"** (owner, 2026-10-23). A new box after the fonts, with a link
   button to the code (`APP_CONFIG.sourceCodeUrl = https://github.com/TameemHabash/wirduk`):
   - `about.openSourceTitle`: "مفتوح المصدر"
   - `about.openSource`: "وِرْدُك تطبيق مفتوح المصدر برخصة MIT: يمكن لأي أحد أن يطّلع على شيفرته،
     وأن ينسخها ويبني عليها تطبيقات أخرى. أما المحتوى والتسجيلات والخطوط فلكلٍّ منها شروطه
     المذكورة في هذه الصفحة."
   - `about.sourceCode`: "الشيفرة المصدرية على GitHub"
   Tests for the box and the link. Ship it only once the repo is public (the link must work).
6. `npm run verify`, commit, push to the current (private) repo, so the archive has it all.
7. On GitHub: rename `TameemHabash/wirduk` → `wirduk-archive` (stays private):
   `gh repo rename wirduk-archive -R TameemHabash/wirduk`.
8. Create the new public `TameemHabash/wirduk`. The auto-mode check blocks
   `gh repo create --public`: ask the owner to run `gh repo create TameemHabash/wirduk --public`.
9. Locally: `git checkout --orphan public-main`, one commit of the whole tree ("Wirduk: first
   public version; earlier history in the private wirduk-archive"), rename it to `main`; keep the
   old branch as `archive-main`. Remotes: `origin` → new `wirduk`, `archive` → `wirduk-archive`.
   Push only `main` to `origin` (old commits are not reachable from it, so they are not sent).
10. Check on GitHub: no `research/`, `git grep` finds no serial, the README and LICENSE show.
11. Turn on GitHub Pages for `wirduk` (source: GitHub Actions); open the new privacy address.
12. `wirduk-audio/privacy/index.html` becomes a short page that sends visitors to the new address
    (meta refresh + a link), so old app builds and old links still work. Public push. (As of
    2026-10-23 only the owner and friends who test it have the app.)
13. New release build for the phones (new privacy address + the About box). Google Play
    (milestone 14) uses the new privacy address.
14. Update this file and the memory notes.

Not affected: the audio site (`wirduk-audio`), the relay, and `wirduk-reports` (always private).

## Milestone 10 — Adwamuha

The owner's big feature (named 2026-10-23; first called "Adwamoha"). Description:
`docs/adwamuha/feature-prompt.md`; build plan: `docs/adwamuha/plan.md`; the owner's answers:
`docs/decisions.md` → "Adwamuha". Matching approved 2026-10-23 (24 steps, step 23 morning and
evening).

Progress (the order in `docs/adwamuha/plan.md`):
- [x] 1. Plan data in the content build + checks (content v10).
- [x] 2. The logic and its tests (`src/features/adwamuha/logic/`, 57 tests).
- [x] 2b. Storage in user.db (migration 4: `AdwamuhaState`, `WardRecords`, `AdwamuhaPauses`,
  `AdwamuhaEvents`, `AdwamuhaShown`; `AdwamuhaRepository`) and the `wardTimes` setting.
- [x] 3. The ward in the reader (`/adwamuha/ward/[session]`, its finish screen, the full category
  counts too, "continue where I stopped" reopens a ward). The owner's texts are cut from the
  description into `src/features/adwamuha/owner-texts.ts` by `scripts/adwamuha/owner-texts.ts`.
- [x] 4. Home card «وردك اليوم» and «مساري» (`/adwamuha`): step and stage, time left, the week so
  far, percentages, the week grid, «جاهز لإضافة الذكر التالي؟» (once a day on Home, then on
  «مساري»), automatic extension, «قرأتُها من حفظي» with undo.
- [x] 5. Settings and reminders: «أدومها» first in Settings (highlighted), the start screen
  (`/adwamuha/start`: the idea, the light-plan notice, the hadith card, the starting step), off
  keeps everything, on again asks continue / start over, the four ward times, the reminders move
  into the section and speak of the ward, a tap opens the ward. Checked on the emulator.
- [x] 6. Step back and plan editing: «طرأ عليّ ظرف…» (half the step, the first three, a break of
  1 or 2 weeks that can end early), the gentle suggestion on Home (once, then 14 days), the plan
  editor (`/adwamuha/plan`: weeks 1–8 for the current and later steps, reorder later steps only,
  reset, the light-plan notice with the hadith before saving a change).
- [x] 7. Explanation screen (`/adwamuha/intro`, first launch of a new install only: user.db
  migration 5 marks it seen on installs that already have data), the light-plan notice with the
  hadith card (start screen, plan editor, «مساري»), the stage tips (once when a stage begins,
  always readable on «مساري»), the owner's messages once each (extension, end of week, end of the
  path with the keep-on / turn-off offer). The hadith card was checked against
  dorar.net/hadith/sharh/113728 on 2026-10-24 (by script, with hashes): every field is the same;
  the text is the same after Unicode NFC (only the order of two marks differs, it looks the same).
- [x] 7b. The owner's review (2026-10-24): no «أكمل باقي الأذكار» anywhere in the feature (a
  gentle line after a ward asks to stop at it today), and the owner's wording for «النية لكل يوم…»
  on the start screen.
- [x] 8. The message library. `scripts/adwamuha/messages.ts` keeps
  `content-source/adwamuha-messages.json`: 33 verses cut from the Tanzil Uthmani text (downloaded
  to `.local/tanzil/`), 29 hadiths and 1 athar from Dorar pages saved on 2026-10-24
  (`.local/dorar-messages/`, 47 searches; only صحيح / حسن). The owner approved all 63 on
  2026-10-24 (after reviewing a shared page made from the library). Content v11: table
  `AdwamuhaMessages`. Each moment shows one message from its pool (the owner's own message + the
  library's), picked by the occasion (`logic/messages.ts`): the same occasion always shows the
  same message. A new step and a step back / break now show in the message card (no toast).
  About credits Tanzil with a link. Checked on the emulator (a hadith, a verse, two verses with
  the end-of-verse sign, About).
- [x] 9. Emulator pass (2026-10-24): Home card, «مساري», plan editor, step-back sheet, a break
  and its message, the ward finish screen (hadith, verse, two verses), About, large text (1.3).
  Found and fixed: a plan begun in the evening counted that day's morning as missed (now it
  counts for nothing: `stepStartedIn` / `planStartedIn` in the plan state). README section.
  Release APK built.

## Milestone 10b — Adwamuha redesign (the owner's design, 2026-10-29)

The owner's design: `docs/adwamuha/flow-design.html` (copy of `adwamuha-flow-latest.html`; its
Arabic texts are cut from it by script). Every screen and state in it, with the behavior in each
screen's notes, in the app's own theme, fonts and components (not the HTML's). Decisions:
`docs/decisions.md` "2026-10-29". Steps:

- [x] 1. Fixes: the backup button on Samsung opens the main Settings (find Google's backup
  screen; test on the emulator with the owner's account); the shadda in «الله» in the hadith;
  the hadith without a source line everywhere (Dorar data kept stored); the splash logo is a
  little cropped. The button now opens Google's backup screen first
  (`com.google.android.gms.backup.ACTION_BACKUP_SETTINGS`: «Backup & reset» with the account,
  one tap to «Backup by Google One»), checked on the emulator with the owner's account
  (2026-10-30); then stock Android's, then the main Settings. To check on the Samsung.
- [x] 2. Logic (`logic/weeks.ts`, `week-start.ts`, `orderWard` in `logic/ward.ts`; details in
  `docs/decisions.md` "How the week rule works"): calendar weeks that start on the phone's first
  day (expo-localization), for the grid, the goal bars and the move-on rule (the last 2 full weeks, 4 mornings + 4 evenings; a
  week cut by the step's start or a break does not count); week messages and the step-back
  suggestion on the same weeks; a later starting step gets 2 weeks; «ترتيب الورد» (plan order,
  default, or category order: same adhkar, same progress) in user.db, with tests.
- [x] 3. Messages in the database: the owner's messages and tips, the design's welcome and
  maintenance tip, chosen by state; after both wards, only the owner's prayer. (Content v12,
  table `AdwamuhaTexts`; the welcome for a later start uses Claude's sentence, for review.)
- [x] 4. Setup 1–3 (4 screens since 10c) (instead of the old explanation and start screens): first launch, and once
  after each app update while Adwamuha is off (the last version shown is kept in user.db).
  Routes `/adwamuha/intro`, `/adwamuha/start`, `/adwamuha/reminders`; the design's texts are cut
  into `common.json` by `scripts/adwamuha/design-strings.ts`. "After each update" needs the app
  version or build number to change (`app.config.ts`; still 1.0.0 / 1 on the test APKs).
- [x] 5. Home with Adwamuha: «وردك اليوم» (hadith line, statuses, one main button, the step
  link, the one-time message, the move-on question and the suggestion), «الأذكار كاملة» small
  cards; Home without Adwamuha unchanged. (The move-on question is no longer a pop-up: it stays
  in the card until answered.)
- [x] 6. «مساري»: ring, featured hadith, «تتبّع الأسبوع» (calendar week, goal bars, legend,
  yesterday's dot), the stage tip, «قرأتُ وردي بدون التطبيق» (with undo), the move-on question,
  break / first week / finished states. (No percentages, no why-light box, no one-time messages
  here; the old «قرأتُها من حفظي» sheet is gone.)
- [x] 7. «أدومها» settings screen: on/off, «ترتيب الورد» with its note and preview, reminders,
  ward times, plan links, «احفظ مسارك» (Claude's own text). Route `/adwamuha/settings`; main
  Settings has one «أدومها» row that opens it.
- [x] 8. Emulator pass (Home, «مساري», setup 1–3, the settings screen, the backup button with the
  owner's account), docs, verify, release APK (2026-10-30), report.

For the owner to check (10b): the welcome for a later start (Claude's middle sentence,
`docs/adwamuha/claude-drafts.json`); a message due comes before the move-on question in
«وردك اليوم»; the backup button on the Samsung (Google's backup screen).

## Milestone 10c — owner feedback 2026-10-30

The owner's words are cut from their chat message by script into `docs/adwamuha/owner-edits.json`
(`designFixes`, `wardNames`); nothing typed. Done:

- Setup 1: the numbers 1–3 in rounded squares (design `.feat .n`).
- Setup 2: «ابدأ من أول خطوة» (the design had «أبدأ», the user's own voice like «أحافظ»; the
  owner wants the imperative). The preview shows every dhikr of the chosen step (first words with
  «…» when cut), and the owner's names «آية الكرسي» and «الإخلاص والمعوذتين» for those two
  (ids 1001/133001 and 1002/133002; `OWNER_TEXTS.wardNames`, `dhikrLabel` in `setup.ts`).
- Setup 3 (new, `/adwamuha/order`, `SetupOrderScreen.tsx`): «ترتيب الورد» as in the settings,
  for the chosen step's ward, the whole ward shown first, «عرض أول أربعة» to shorten it. The
  reminders are now setup 4 (still «ابدأ مساري» at the end). Shared part: `WardOrderPicker.tsx`.
- «ننصح به» is a badge after «ترتيب الخطة» (design `.tag`); the choice notes are smaller than
  their titles (caption), as the other settings notes; the order preview has numbers in rounded
  squares (design `.oi span`), the four first in the settings with «عرض الورد كله (N)».
- «أدومها» settings: «ترتيب الورد» moved under «الخطة», before «احفظ مسارك».
- Home: «الصباح والمساء» above the quiet morning and evening cards (was «الأذكار كاملة»).
- Main Settings: «غير مفعّلة» showed «غير» on the Galaxy S21+ (drawn wider than measured, the
  last word wrapped and was cut, as reports#2). `LinkRow`'s value now gets more room.
- The splash: the 10b images never reached the APK (`android/` was not prebuilt after the change).
  `npx expo prebuild --platform android` now done; it failed with EBUSY while an adb server
  started from inside `android/` was running (restart adb from the repo root first).
- «مساري»'s goal bars («هدف الأسبوع · شرط الانتقال») were already there, from the first full
  week; the week the step starts in shows the design's «هدفك: ٤ أيام من ٧…» line instead (the
  design's «أول أسبوع» state: no goal bars). Asked the owner if they want the bars there too.

## Milestone 10d — «بداية الأسبوع» (the owner's design, 2026-10-30)

The design was updated (`docs/adwamuha/flow-design.html`, copy of the owner's new
`adwamuha-flow-latest.html`). Done:

- A new section in «أدومها»'s settings, after «أوقات الورد»: Friday, Saturday, Sunday or Monday
  (Saturday by default, no mark), a live preview of the 7 days with the first one marked, and the
  design's hint. Stored in user.db (setting `weekStart`; any day 0–6 is accepted).
- It is the only source of the week's first day: `week-start.ts` (the phone's region, through
  expo-localization) is removed. expo-localization stays for the layout direction.
- A change applies at once: the grid, the goal bars, the move-on rule and the step-back
  suggestion are worked out again from the stored days. The week that just ended on the new days
  brings no end-of-week message (`setWeekStart` marks it shown).
- «مساري»: the days to come are dashed and faded, their names faded (design); «هدف هذا الأسبوع».
- The design's new texts are cut by `design-strings.ts` (it now also owns `adwamuha.weekdays`,
  the short day names, which already matched the design).

## Milestone 11 — update the morning and evening recordings

The sheet for the owner (2026-10-31): `docs/audio/morning-evening-audio.csv`, written by
`node scripts/content/audio-sheet.ts` from the content database: 31 recordings (the morning
order, one row when the evening says the same words, then the 7 said only in the evening). The
owner fills `new_file_path` and `new_recording_says`.

Done (2026-10-31), all from the owner's filled sheet (30 files in `D:\Downloads\Thekrak`, m4a,
AAC about 131 kbps):

- [x] `node scripts/content/apply-audio-sheet.ts ../wirduk-audio/audio/ar` checks each row (the
  file is there and is an m4a or mp3; `new_recording_says` divides the count), copies each file
  to the audio site named after its dhikr (`1001.m4a`, `133003.m4a` for an evening-only one; one
  file used by two rows once: 1018 and 1019 say the same words), and writes `audioRecordings`
  (dhikr → file) and `audioRepeats` (1017 and 1022: 5 times per play) into `overrides.json`.
- [x] Not converted to mp3 (converting would lose quality): the app keeps a name's own extension
  (`audioFileName`; the book's names have none and stay `.mp3`). New names, so the old mp3 files
  stay on the site unchanged for older app versions.
- [x] `make-audio-manifest.ts` lists m4a files too (427 entries); content v13: 273 recordings, the
  morning and evening ones are the owner's 30 (12.0 MB; «تحميل صوتيات الصباح والمساء» shows it).
  The 7 evening-only adhkar have their own recordings now (§E of `content-review.md` is solved).
- [x] On start, the app deletes downloaded recordings no dhikr plays any more
  (`AudioDownloads.removeUnused`, promised 2026-10-23).
- [x] wirduk-audio pushed (30d2cc7: the 30 m4a and the README). Release APK.
- Row 26 (133004): the owner's path came back in the sheet (`2&1.m4a`).
- Next time: the owner fills the sheet again (or a new one: `node scripts/content/audio-sheet.ts
  --force` writes a fresh one from the content), then the same steps.

## Milestone 10e — owner feedback 2026-10-30 (2)

- «مساري»: a line before the goal («هدف هذا الأسبوع · شرط الانتقال», or the first week's
  sentence), as the design's `.goal` top border.
- Audio: only «تحميل صوتيات الصباح والمساء» shows (24 files then, 30 since milestone 11, about
  12 MB, the recordings of the morning and evening adhkar; the size comes from the content
  database). "Download every
  recording" stays in the code, hidden (`APP_CONFIG.audio.showDownloadAll`). «حذف الصوتيات
  المحمّلة» still removes every recording on the phone (also those downloaded by playing them).

## Milestone 12 — backup (automatic + a backup file)

Owner's request (2026-10-23): Adwamuha keeps important personal data, so the user must be able to
keep it safe. Talked through on 2026-10-25; the owner's answers:

1. **Both:** fix Android's automatic backup to the user's Google Drive, and add a backup file.
2. **Restore replaces all** (no merge), after a safety copy of the current data.
3. **Reminder:** the last backup dates in Settings, and a gentle note when the automatic backup
   is not working (Android never backed up the app, or the last time was over 30 days ago).
4. **The file includes the user's own recordings.**

Found while preparing (2026-10-25): `allowBackup` is on with no rules, so Android tries to copy
all the app's files. Downloaded adhkar audio (≈116 MB) is in the same place and Android's limit
is 25 MB per app: above it the whole backup is skipped. So users who downloaded the audio have
no automatic backup today.

The plan:

- **Automatic (Android):** backup rules (Android 12+ `dataExtractionRules`, older
  `fullBackupContent`) that keep only the small data: `user.db` (+ its `-wal`) and the backup
  dates. Not the content database, not any audio, so it never passes 25 MB. A small
  backup agent (local Expo module in `modules/`, with a config plugin; `android/` stays
  generated) saves the date each time Android backs the app up. Android does not let an app ask
  whether backup is on; "never" covers that case.
- **Backup file:** Settings → «النسخ الاحتياطي»: «حفظ نسخة احتياطية» makes one file (a copy of
  `user.db` and the user's own recordings, with a format version) and opens the share sheet
  (Google Drive, Files, WhatsApp…). The app sends nothing itself. «استعادة نسخة احتياطية» picks a
  file, shows its date and what is inside, asks to confirm, keeps a safety copy on the phone, then
  replaces the data. Older files go through the usual migrations; damaged files or files from a
  newer app are refused with a clear message.
- **After any restore** (file or Android's): downloaded-audio rows whose files are missing are
  dropped, so the app downloads them again when needed.
- **Note on Home:** when the automatic backup is never / over 30 days old **and** no backup file
  was saved in the last 30 days, a gentle note suggests saving one (once, then not for 30 days).
- **Privacy page** (`wirduk-audio`, public: owner's OK before the push): backups stay with the
  user (their file, or their own Google account); nothing comes to us.
- **Tests:** the file round trip, refusing bad files, the note's rule; on the emulator, Android's
  backup with `adb shell bmgr` (local transport): backup, clear the app, restore.
- **iOS later (milestone 15):** the same file works there; the phone's own iCloud backup covers
  the rest. Mark downloaded audio "not for backup" there (Apple's rule for files that can be
  downloaded again).

Done (2026-10-25):

- [x] 1. The backup file's core (`src/data/backup/backup-db.ts`): save, check (not a backup /
  newer / damaged), migrate an older one, restore in one transaction, keep this phone's own
  tables. Node tests with real files, including a restore that fails half-way.
- [x] 2. In the app: Settings → «النسخ الاحتياطي» (after «أدومها»), the share sheet
  (`expo-sharing`, sharing out only), pick + confirm + safety copy + restore + the app starts
  again; the note on Home. Android's rules and backup agent (`modules/wirduk-backup`,
  `plugins/with-backup-agent.js`).
- [x] 3. Emulator: saved a file (102 KB) through the share sheet, changed a day, restored the
  file from Downloads (the change undone, "restored" shown, the safety copy kept). Android's
  backup with `bmgr` (local transport): it copied only `user.db`, its WAL and the date file
  (≈4.2 MB), the agent saved the date; after clearing the app and `bmgr restore`, «أدومها» and
  its days came back and Settings showed both dates.
- [ ] 4. Privacy page update: drafted in `wirduk-audio` (backup section, «أدومها» in the stored
  data, "removed on uninstall, except a backup"); waits for the owner's OK to push (public).
- [x] 5. Release APK.
- [x] 6. The owner's notes (2026-10-25): the section moved just before «الدعم»; the «أدومها»
  start screen has «احفظ مسارك»; when Android's backup looks off, «تفعيل النسخ الاحتياطي في
  الهاتف» opens the phone's backup screen (checked on the emulator: Google's backup opt-in
  opened). The privacy page was pushed (wirduk-audio 4308dda). The next release APK waits for
  the owner's Adwamuha edit.

## Milestone 13 — quality

Steps (2026-10-31):

- [x] 1. **Every «أدومها» state, tested from start to end** (owner, 2026-10-30: the path takes
  more than a year, so it cannot be checked by hand). `docs/adwamuha/states.md` lists every state,
  how it is reached, what shows, and its tests. `logic/plan-walk.test.ts` walks whole plans day by
  day with the app's rules (steady, 4 of 7, 3 of 7, «أبقِني أسبوعًا آخر», random users);
  `scenarios.test.tsx` lives 16 kinds of users through the real app with a fake clock
  (`src/test-utils/adwamuha-scenario.tsx`). Found and fixed: turning «أدومها» off in the evening
  lost that day (`offPause` now starts the day after).
- [x] 2. A dev-only clock: `wirduk://dev-clock?days=7&hour=20&read=4` moves «أدومها» days ahead
  in a dev build (and stores the skipped days' wards as read: `all`, `none`, or N of 7); a release
  build ignores it (`src/app/dev-clock.tsx`, `dev-clock.ts`). Screenshots of 8 states on the
  emulator, on a private page for the owner: https://claude.ai/artifact/4hdGamaFSHf47kXS6VSreh
  (the emulator's test plan now has made-up days, dated ahead: clear its app data to start clean,
  with the owner's OK).
- [x] 3. Cleanup (2026-10-31):
  - The test warning "An update to VirtualizedList … not wrapped in act(...)": the lists drew more
    rows on a 50 ms timer that sometimes fired after a test ended (Home, own adhkar, session
    restore, «مساري»). In tests, FlatList and SectionList are now simple lists that draw every row
    at once (`src/test-utils/simple-lists.tsx`).
  - The content database copies expo-asset leaves in the cache (`ExponentAsset-*.db`, ≈4.6 MB
    each) are deleted once the content is installed and checked (`open-databases.ts`).
  - Permissions: `READ/WRITE_EXTERNAL_STORAGE` and `SYSTEM_ALERT_WINDOW` removed
    (`android.blockedPermissions` in `app.config.ts`; files come through the system's file
    picker). Kept: internet, background audio, audio settings, microphone (own recordings),
    vibration (and the notification ones the libraries add).
  - `expo-network` removed (not used). `expo install --check`: up to date. `expo-doctor`: 21 of 21.
  - `npm audit` (app dependencies): 41 findings, almost all in build and test tools (Expo's CLI,
    config plugins, Jest, glob, minimatch, node-forge, zod). One ships in the app:
    `decode-uri-component` under `query-string` (expo-router's link parsing; a crafted deep link
    could slow the app). Its fix comes with an Expo patch: run `npx expo install --fix` before
    Google Play. Never `npm audit fix --force` (it would install Expo 51).
  - Checked on the release manifest (merged): no storage, no "draw over other apps". Libraries
    still add Google push (`c2dm.RECEIVE`), Play's install referrer and launcher badge permissions;
    the app uses none of them (local reminders only, no tracking). Review before Google Play
    (milestone 14): block them too if nothing breaks.
- [x] 4. Edge cases from the brief §16 (2026-10-31): no network, a full phone and cut downloads
  were already tested (audio-downloads, audio-screens, ReportScreen). New (`edge-cases.test.tsx`):
  the longest dhikr at the largest font size (40) shows all its text, the counter and «إتمام»
  work; dark mode everywhere: 16 main screens drawn in dark and in light use no color of the
  other theme (`renderWithApp`'s new `theme` option). A large system font: on the owner's phone
  (step 5).
- [x] 5. The owner's phone (Galaxy S21+, release APK 68a8074, 2026-11-01): TalkBack, the largest
  system font, audio with the screen off, reminders, a report, rotation, «المتابعة من حيث توقفت»,
  and the changes since the last test. All fine (`docs/manual-test-checklist.md`).

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
