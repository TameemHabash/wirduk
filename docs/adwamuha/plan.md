# Adwamuha (أدومها) — build plan (milestone 10)

The owner's description: [feature-prompt.md](feature-prompt.md) (a copy of the owner's file, not
edited). Matching of the default plan: [matching.md](matching.md) (made by
`scripts/adwamuha/match-plan.ts`). This file: how it will be built. Written 2026-10-23.
**The owner's answers (they win over the description and over this file) are in
`docs/decisions.md`, section "Adwamuha".**

## Text that comes from the owner

Nothing Arabic is typed by hand. A script cuts from `feature-prompt.md`: the match keys, the stage
names, the button labels the prompt gives («قرأتُها من حفظي», «طرأ عليّ ظرف أو مستجد في حياتي»,
«أضِف الذكر التالي», …), the encouragement and tip texts (into one module marked "owner-authored,
pending owner review") and the hadith card. The dhikr text and count always come from the content
database.

## Content database (content v10)

- `content-source/adwamuha-plan.json`, written by the match script once the owner approves the
  matching: stages (number, minimum weeks), steps (number, stage, session: both / morning /
  evening, the morning and evening dhikr ids, the match key), the opening ids, and the dhikr left
  out on purpose (with the reason).
- New tables: `PlanStages`, `PlanSteps`, `PlanStepAdhkar (Step, Session, DhikrId)`, and the
  hadith card (`Hadiths`: text, narrator, scholar, book, number, grading, takhreej, Dorar link;
  checked against dorar.net with the existing `scripts/dorar` tools before it is stored).
- Build checks (the build fails): every id is in the right category; its key still matches it
  (so a content change cannot silently move the plan); each step adds exactly one dhikr per
  session; every morning and evening dhikr is in the plan once, or listed as left out with a
  reason.

## User database (migration 4, add only)

- `AdwamuhaState` (one row): on/off, current step, the date the step started, the next "ready?"
  date (after «أبقِني أسبوعًا آخر»), highest step reached, maintenance mode.
- `AdwamuhaEvents`: every start, move on, extension, postponement, step back, break, restart
  (history; nothing is deleted).
- `AdwamuhaPlan`: **the user's own copy of the plan**, made when the feature is turned on and the
  plan confirmed (owner): steps in order, their dhikr ids per session, stage and weeks. The app
  reads only this copy; a content update never changes it. "Reset" copies the default again.
- `WardRecords (Date, Session, CompletedAt, Late, Source reader/manual, Step)`, one per date and
  session.
- `AdwamuhaBreaks (FromDate, ToDate)`.
- Settings (the existing settings table): the four times, and the "already shown" flags.

## Pure logic (no React; unit tests for each case in §12 of the prompt)

`src/features/adwamuha/logic/`: `sessions.ts` (a time → date, session, on time / late, at all the
boundaries; local time when the record is made), `ward.ts` (the cumulative ward per step and
session, the opening first), `commitment.ts` (7-day windows, breaks left out, percentages),
`progress.ts` (move-on condition, automatic extension, «أبقِني أسبوعًا آخر», step back, the
1-week re-climb, the low-commitment suggestion and its 14-day pause, maintenance after the last
step), `plan-edit.ts` (reorder rules, 1–8 weeks, reset).

## Screens (reuse what exists)

- **Ward in the reader:** a new route `/adwamuha/[session]` gives the existing reader a list of
  adhkar (the ward) instead of a category: same counting, audio, fonts, "إتمام". Finishing it
  records the day and shows the prayer message, and a gentle line to stop at the ward today. No
  «أكمل باقي أذكار الصباح/المساء» (owner, 2026-10-24: see `docs/decisions.md`).
- **Home:** the «وردك اليوم» card on top (only when on); everything else unchanged below it.
- **«مساري»** (progress): step and stage, the path 1–24, percentages, the week grid, time left,
  the buttons, the hadith card, the stage tip.
- **Plan editor:** the existing drag list, a weeks picker, «استعادة الخطة الافتراضية», the
  warning before saving.
- **Settings → «أدومها»:** the switch, the four times, the reminders (moved here when on: the same
  stored values), step back, plan editor.
- **Explanation and activation:** a short explanation screen on the first launch of a new install
  (nothing after an update) and on turning the feature on; the activation screen with the
  light-plan notice, the hadith card and the starting step. The «أدومها» section is prominent in
  Settings.

## Reminders

Same two reminders and stored values. When on: tapping opens the ward of that session, and the
text speaks of the ward. Turning the feature on or off, or changing a time, re-schedules through
the same code (so never two notifications).

## Order of work (tests and `npm run verify` after each step, a commit each time)

1. Plan data in the content build + checks (after the owner approves the matching).
2. The logic and its tests.
3. The ward in the reader.
4. Home card and «مساري».
5. Settings and reminders.
6. Step back and plan editing.
7. The explanation screen, the light-plan notice, the hadith card, tips.
8. The message library: hadiths and athar from Dorar (صحيح / حسن), verses from the tanzil.net
   text, the owner's prayers; about 10 per moment; each approved by the owner.
9. Emulator pass, docs, release APK, report.

## Also

- The backup file (milestone 12) will include all the new tables.
