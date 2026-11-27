# src/features/adwamuha — «أدومها»

The owner's big feature: a habit plan for the morning and evening adhkar that grows one dhikr
at a time. Inputs in `docs/adwamuha/`: the owner's description (`feature-prompt.md`), the
owner's later edits (`owner-edits.json`, cut from the owner's chat messages by script), the
design (`flow-design.html`), every state and its test (`states.md`). Decisions:
`docs/decisions.md`.

## Where things are

- Pure rules: `logic/` (tested in Node). "Today" is always `slotAt(now).date`. Weeks are calendar
  weeks from the first day (`logic/weeks.ts`); the first day is the setting `weekStart`
  («بداية الأسبوع», Saturday by default, never the phone's region), changed with `setWeekStart`.
- App state and actions: `state/AdwamuhaProvider.tsx` with `useAdwamuhaData` (read, reload),
  `useMessageLibrary` (texts, choosing a message), `useActionHandlers` (everything that changes
  the plan). The actions never change and have their own context. Use the narrowest hook:
  `useAdwamuhaEnabled`, `useAdwamuhaStatusOptional`, `useAdwamuhaActionsOptional`; `useAdwamuha()`
  draws again on every change of the data.
- Data: shared types and defaults in `src/data/models/adwamuha.ts`; the user's copy of the plan in
  user.db (migration 4, `AdwamuhaRepository`). The default plan:
  `content-source/adwamuha-plan.json` (written by `scripts/adwamuha/match-plan.ts --write`, keys
  and stage names cut from the owner's file; checked on every content build by
  `scripts/content/lib/plan.ts`; read with `ContentRepository.getDefaultPlan`).
- Screens (routes in `src/app/adwamuha/`): setup in 4 screens (`Setup{Intro,Start,Order,Reminders}Screen`,
  `logic/setup.ts`: the "shown" key per app version, `dhikrLabel`); «مساري» (`ProgressScreen`,
  `BeadPath`, `PlanRows`, `WeekGrid`); the ward (`WardScreen` uses the reader's
  `Reader.tsx`; `WardDoneScreen`); settings (`AdwamuhaSettingsScreen`, `/adwamuha/settings`;
  main Settings has one row to it, `components/AdwamuhaSettings.tsx`); «ترتيب الورد»
  (`WardOrderPicker`); «عدّل الخطة» (`PlanEditorScreen`, `logic/plan-edit.ts`,
  `logic/plan-editor-state.ts`); «طرأ عليّ ظرف» (`StepBackSheet`, `stepBackTarget`). Home's
  card: `TodayWardCard`; Home's badge while off: `home/components/HomeHeader.tsx`.
- Step labels: the first 6 words or the owner's name (`stepLabel` in `logic/setup.ts` +
  `hooks/useDhikrTexts.ts`; names in `OWNER_TEXTS.wardNames`).

## The owner's rules (keep them exactly)

- Move on: a step of N weeks needs N good weeks: 4 mornings and 4 evenings each, not in a row,
  counted once the week is over (owner, 2026-11-14; `goodWeeks` in `logic/weeks.ts`,
  `moveOnStatus`). Never automatic, never extended by itself: «جاهز لإضافة الذكر التالي؟» waits
  for the user.
- A ward never opens outside its window (owner, 2026-11-21; `closedWard` in `logic/sessions.ts`,
  checked by a reminder tap, the session restore and `WardScreen`). With «أدومها» on, a reminder
  tap opens the ward unless it is read today or not its time: then a toast
  (`reminders/hooks/useReminders.ts`).
- The ward read in parts: `logic/ward-progress.ts` + user.db `WardProgress` (migration 6, a phone
  table, not in backups), kept while its window is open.
- No message (after a ward, or Home's one-time ones) repeats before all of its moment were shown
  (owner, 2026-11-21; `nextPick`, rounds in user.db migration 7 `AdwamuhaMessagePicks`; Home's are
  saved when dismissed).
- «عدّل الخطة»: later steps reordered, weeks, reset keeps the steps done; «قطعتها» marks the
  current or a later step as passed (owner, 2026-11-22; `passSteps` moves the step on).
  «لم أقطعها بعد» (owner, 2026-11-26) puts a done step back right after the current one
  (`withEdits`, `passSteps(…, unpassed)`).
- «طرأ عليّ ظرف»: «ارجع إلى الخطوة:» a step picked with − and + (owner, 2026-11-22), and the
  breaks. «نصف الخطوة» / «الخطوات الأولى» were removed in the redesign; old logs still load.

## The owner's texts (generated: never edit the outputs by hand)

- `node scripts/adwamuha/owner-texts.ts` writes `generated/owner-texts.ts` (labels, the hadith,
  `OWNER_TEXTS`) and `content-source/adwamuha-texts.json` (messages and tips, each chosen by
  state → content table `AdwamuhaTexts`, `ContentRepository.listAdwamuhaTexts`; `textFor` /
  `chooseMessage`). Its inputs: the description and `owner-edits.json`. Claude's drafts for the
  owner's review: `docs/adwamuha/claude-drafts.json`.
- The design's interface texts go into `common.json` (`adwamuha.setup`, …) with
  `node scripts/adwamuha/design-strings.ts` (a test checks them; the owner's fixes are
  `designFixes` in `owner-edits.json`).
- The message library (verses from Tanzil in `.local/tanzil/`, hadiths from saved Dorar pages):
  `scripts/adwamuha/messages.ts`; the owner approves each; the approved ones ship in the content
  table `AdwamuhaMessages` (`ContentRepository.listAdwamuhaMessages`); `logic/messages.ts` picks
  one per moment.
- After a change: a new content version (`/content-change`).

## Time

- **React Compiler stays off**: «أدومها» reads the clock while drawing (`slot()`, `now()` in about
  10 files), and the compiler keeps the first result, so "today" would stay stuck (12 scenario
  tests fail). Make "today" state first (`docs/status.md`, RF5).
- On the emulator (dev build only): `Open-Link 'wirduk://dev-clock?days=28&hour=20&read=all'`
  moves «أدومها»'s clock ahead (`read`: all, none, or N of 7 for the skipped days;
  `screens/DevClockScreen.tsx`, `state/dev-clock.ts`). Restarting the app brings the real time
  back, but the stored days stay.
- On the release build over 40 days: `npm run e2e:timeline` (~30 min, `e2e/README.md`).

## Tests

- Every state names its test in `docs/adwamuha/states.md`, checked by
  `__tests__/states-doc.test.ts`: a renamed or split test file must be renamed there too.
- Over days and weeks: `startScenario` (`src/test-utils/adwamuha-scenario.tsx`) drives the real
  provider with a fake clock (`live`, `away`, `run`, `show`, and day-by-day scripts:
  `s.play('days 2-27: both wards, app closed')`). About 0.1 s per day: keep them to weeks. Whole
  plans: `logic/plan-walk.test.ts` (pure, seconds).
- Data for a test: `givenAdwamuha(repos, { step, … })`, `givenWardRead`, `givenDaysRead`
  (`src/test-utils/given.ts`); `renderWithApp`'s `weekStartsOn` saves the week start.
