# «أدومها» — every state, and the test that covers it

Milestone 13 (owner, 2026-10-30): the path takes more than a year, so it cannot be checked by hand.
Each state below is reached in a test, and what the app decides and shows there is checked.

- `logic/plan-walk.test.ts`: whole plans, day by day for up to 3 years, with the app's own rules
  (a steady user, exactly 4 of 7 days, 3 of 7, «أبقِني أسبوعًا آخر» every time, random users).
  Every day: the numbers match the dots; asked only when the rule is met; extended only when it
  is not.
- `scenarios.test.tsx`: shorter lives through the real app (provider, user.db, messages, screens),
  with a fake clock (`src/test-utils/adwamuha-scenario.tsx`).
- The other files: each screen in detail.
- On the emulator: the dev-only clock (`wirduk://dev-clock?days=…&read=…`) reaches the later states
  without waiting; screenshots of 8 states (2026-10-31):
  https://claude.ai/artifact/4hdGamaFSHf47kXS6VSreh (private to the owner).

| State | How it is reached | What shows | Tests |
| --- | --- | --- | --- |
| Off, setup | First launch; after an app update while off | Setup 1–4 | `setup.test.tsx` |
| Start at step 1 | Setup, «ابدأ من أول خطوة» | Home: welcome, then the stage tip | `setup.test.tsx`, `scenarios` (steady) |
| Start at a later step | Setup, «أحافظ على بعضها» | 2 weeks on it, then the question | `scenarios` (later step), `progress.test.ts` |
| Started in the evening | Setup after the evening began | That morning «—», its week cut | `setup.test.tsx`, `scenarios` (evening) |
| A normal day | Morning or evening open | «وردك اليوم»: now, not yet, done, late, missed | `progress-screens.test.tsx` |
| Both wards done | Morning and evening read | The owner's prayer only | `progress-screens.test.tsx`, `messages.test.tsx` |
| A late ward | Read after its on-time end | A clock; it still counts | `scenarios` (late), `sessions.test.ts` |
| The first (cut) week | The step began inside the week | No bars: «هدفك: ٤ أيام من ٧…» | `progress-screens.test.tsx`, `scenarios` |
| A full week | All 7 days in the step | Goal bars = the dots | `plan-walk`, `scenarios` |
| End of a full week | Its last day is over | A word (target reached, or not) | `scenarios` (steady), `messages.test.tsx` |
| Before the minimum | The step's weeks not over | Ring: days left | `scenarios`, `progress-screens.test.tsx` |
| The question | Minimum over, last 2 full weeks 4 + 4 | Home and «مساري»: «جاهز لإضافة الذكر التالي؟» | `plan-walk`, `scenarios`, `progress-screens.test.tsx` |
| «أضِف الذكر التالي» | The user adds | Next step; a word; a new stage's tip | `plan-walk` (all 24 steps), `scenarios` |
| «أبقِني أسبوعًا آخر» | The user waits | Asked again 7 days later | `plan-walk`, `scenarios` |
| Extended | Minimum over, short of 4 + 4 | One more week; a kind word | `plan-walk`, `scenarios` (3 days a week) |
| Not opened for weeks | The app opens after a long gap | One extension of enough weeks | `scenarios` (not opened) |
| The gentle suggestion | 2 full weeks short | «طرأ عليّ ظرف» offered; then 14 days quiet | `plan-walk`, `scenarios`, `stepback-plan.test.tsx` |
| Step back (half / first three) | «طرأ عليّ ظرف» | A word; reached steps a week each | `scenarios`, `stepback-plan.test.tsx` |
| A break (1 or 2 weeks) | «طرأ عليّ ظرف» → break | A line in the grid; days count for nothing; «أنهِ الاستراحة» | `scenarios` (break), `stepback-plan.test.tsx` |
| Off, then on (continue) | Settings switch | The days between count for nothing | `scenarios`, `settings-reminders.test.tsx` |
| Off, then on (start again) | «ابدأ من جديد» | A new plan from today; history kept | `scenarios`, `setup.test.tsx` |
| Read outside the app | «قرأتُ وردي بدون التطبيق», yesterday's «+» | Today or yesterday only; undo | `scenarios`, `progress-screens.test.tsx` |
| The last step done | Step 24, the rule met | «وضع المحافظة», the end word, its tip; no question | `plan-walk`, `scenarios` (end) |
| The plan edited | «عدّل الخطة» | The step stays; the ward follows | `scenarios`, `stepback-plan.test.tsx` |
| Ward times changed | «أوقات الورد» | The windows move | `sessions.test.ts`, `settings-reminders.test.tsx` |
| Ward order | «ترتيب الورد» (setup 3, settings) | The same adhkar, another order | `ward.test.ts`, `WardScreen.test.tsx`, `setup.test.tsx` |
| Week start changed | «بداية الأسبوع» (any of 4, mid-week) | Grid and bars from that day; no repeated word | `settings-reminders.test.tsx`, `messages.test.tsx`, `weeks.test.ts` |
| The phone's date moves back | The clock goes back | Nothing breaks | `scenarios` (date back) |
| Reminders | Setup 4, settings | Two daily notifications | `setup.test.tsx`, `settings-reminders.test.tsx` |
| Backup and restore | Settings | The path comes back | `backup-db.test.ts`, `backup-screens.test.tsx` |

## Found while testing (2026-10-31)

- Fixed: turning «أدومها» off in the evening, after both wards, made that day count for nothing.
  The day it is turned off and the day it is turned on again now both count (`offPause`).
- As designed, for the owner to know: the day of «أضِف الذكر التالي» is both the old step's last
  day and the new step's first (a whole plan can take a day less per step than its weeks).
- As designed («استراحة من اليوم»): a break taken on a day already read makes that day count for
  nothing too; its ticks stay in the grid.
