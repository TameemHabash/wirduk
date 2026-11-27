# Refactor plan (RF6–RF8 still to do)

The refactor the owner asked for on 2026-11-27 (`docs/status.md`, "Refactor"). RF0–RF5 are done
(RF5's plan is kept below for the record; what was done is in `docs/status.md`). This file is the
plan for the rest; delete it at the end of RF8.

## How each RF runs (owner's rules)

- **One RF per session** (owner, 2026-11-27). At the start: read `docs/status.md` (the table and
  the RF notes) and this file, then do only the next RF. At the end, tell the owner to start a new
  session and say "continue the refactor".
- Nothing the user sees changes. A visible change only for a strong reason, after asking.
- When it is done: `npm run verify`; when app code changed, the screen check (below); update the
  table and add the RF's notes in `docs/status.md`; commit (message in a new file with the Write
  tool, no AI attribution, no `Co-Authored-By`), push `main`, report in simple English with the
  full milestones table, stop.
- Screen check: `. .\scripts\dev\e2e.ps1; Install-E2eApk; Invoke-E2e shots -Name latest`, then
  `npm run shots:compare` (baseline vs latest). Look at every screen it lists and explain or fix
  it. Baselines (old code, 22803cf): `.local/shots/baseline`, `-dark`, `-big`. The emulator needs
  `hw.keyboard=no` (`e2e/README.md`).
- Owner decisions during the refactor: the user's data is kept (RF2); the two bottom sheets stay
  different (RF3); a link to the open chapter goes to its dhikr (fixed).

## RF5 — Speed (measure, fix, measure again) — done

Numbers before (`.local/baseline.md`, emulator, release build): cold start median 609 ms; reader,
20 swipes: 11.2% janky frames. `Measure-E2ePerf -Name <name>` (in `scripts/dev/e2e.ps1`) measures
both after a shots run.

1. **The «الأذكار» tab opens slowly (owner, first).** It draws all 131 chapters at once in a plain
   `ScrollView` (3 texts, a button and an SVG star per row), and `useFocusEffect(reload)` rebuilds
   every row object on each visit, so `memo(CategoryRow)` never helps. Fix: a virtualized list
   (only the rows on screen are drawn; the same card look: border, rounded first and last rows,
   hairline lines), keep the old objects when nothing changed, one shared categories load with
   Home (`adhkar/hooks/useHomeCategories.ts`). Measure the time from the tab tap to the list on
   the release build (for example with Perfetto: the JS thread's busy time after the tap), before
   and after. Screens 03, 04, 20 must stay the same.
2. Reader: draw only the pages near the current one; a tap re-renders only its page (a per-id
   counter subscription with `useSyncExternalStore`; `counterStore.subscribe` exists).
3. «أدومها»: state and actions in two contexts (the actions are already one memoized object in
   `useAdwamuhaActions`), small selector hooks (e.g. `useAdwamuhaEnabled`) for Home and Settings.
4. Audio "download all": progress updates throttled; the status not read again on every tick.
5. Start-up: reads that do not need each other run in parallel.
6. React Compiler: read the SDK 57 docs first; turn it on (with its lint rules) only if every
   test, the screen compare and the numbers stay good.
7. Report the numbers before and after.

## RF6 — Better tests

- Test kit in `src/test-utils/`: `givenAdwamuha(repos, { step, … })` (replaces about 11 copies of
  "turn on «أدومها»"), named content ids (`fixtures/content.ts`), `tr('key')` to find UI text from
  `common.json` (no typed Arabic; the owner-words tests keep their exact checks), mocks in `mocks/`.
- Rewrite brittle tests to check behavior (what the user sees, what is saved), not mock call counts
  or style props (the color and contrast tests stay). One behavior per test, clear names.
- Split files named after scenarios by what they test: `audio-screens`, `custom-screens`,
  `stepback-plan`, `settings-reminders`, `reader-extras`; and `user-repositories.test.ts` (its
  file was split in RF3) into one test per repository.
- Faster «أدومها» scenarios: long walks in pure logic, React scenarios short.
- Coverage never below the RF0 numbers (statements 89.0%, branches 82.4%, functions 86.9%, lines
  91.1%); set Jest coverage thresholds at the final level.
- Maestro as the top layer: `npm run e2e` runs user flows with checks, not only pictures.
- «أدومها» over time, three layers: (1) a test that reads `docs/adwamuha/states.md` and fails when
  a state has no test named for it; (2) Jest scenarios written as short day-by-day scripts
  (`day 1: both wards`, `day 9: open the app`, `expect: …`); (3) an emulator timeline
  (`scripts/dev/e2e-timeline.ps1`, `npm run e2e:timeline`): the release build, the emulator's date
  moved day by day, small Maestro flows, checks at key points (day 1, end of week 1, a full step,
  «أبقِني أسبوعًا آخر», a break and its end, a step back, a reminder tap outside the ward's time,
  the ward read in parts).

## RF7 — Claude Code setup and docs

- `CLAUDE.md` short (about 120 lines; score it with the claude-md-improver rubric before and
  after): the owner's rules, commands, a short map, where new code goes, general traps. Area rules
  move to nested `CLAUDE.md` files: `src/data/` (SQLite traps, migrations, content version steps),
  `src/features/reader/` (screen-off timers, pager width, focus reload), `src/features/adwamuha/`
  (rules, generated texts, scenarios, dev clock), `scripts/` (content pipeline, Dorar, cutting
  Arabic, audio sheet), `e2e/` (Maestro, emulator state, phone build).
- `.claude/settings.json` (committed): allow the common safe commands (verify, jest, prettier
  check, git status/diff/log, db:peek, adb read-only); deny `git push --all`, `--mirror`, and
  pushing `archive-main` to `origin`.
- `.claude/hooks/guard-git.mjs` (Node; no Arabic in `.ps1`): blocks a commit message with
  `Co-Authored-By` or AI attribution, and a push of any branch but `main` to `origin`.
- Skills in `.claude/skills/`: `finish-milestone` (verify → table → message file → commit → push →
  report), `check-screens` (release build → Maestro → compare), `content-change` (the ordered
  content-version steps), `phone-apk` (only when the owner asks).
- `AGENTS.md`: keep Expo's rules, fix what does not fit (`app.config.ts`, no bun, local builds).
- README shorter and current; `docs/architecture.md` expanded (layers, data flow, providers, how
  to add a screen / feature / migration / string / content change).
- Update the memory notes.

## RF8 — Full check and report

- `npm run verify`, `npm run test:coverage` (≥ the RF0 numbers), `npx expo-doctor`.
- Release build: `npm run e2e`, `npm run e2e:timeline`, `npm run e2e:shots` in light, dark and
  font 1.3, each compared with its baseline: every screen the same, or each difference explained
  (and approved by the owner if visible).
- Dev build: the dev-clock states (a filled week, «جاهز لإضافة الذكر التالي؟», a break) and audio
  with the screen off.
- Speed before and after: `Measure-E2ePerf`, `Measure-E2eCpu`, `Measure-E2eLatency` against
  RF5's numbers (`docs/status.md`, RF5; `.local/perf-*-before-rf5.txt`, `-rf5a.txt`).
- A private page for the owner with before / after pictures side by side.
- Offer (do not build) the phone APK. Delete this file.
