# Feature: "أدْومُها" (Adwamuha): a gradual habit plan for morning and evening adhkar

the new work should fits what is already here.

## 1. What this feature is

Today the app is an adhkar reader. With this feature, its **main purpose** becomes helping the user **build the habit** of reading the morning and evening adhkar every day. The current adhkar reader stays exactly as it is and becomes the **secondary purpose**. Do not remove or redesign any current feature.

The method is to start with something very small and stay with it, then add a little at a time. This is well supported in habit psychology, and it matches how Islamic obligations were introduced gradually. The guiding hadith is «أحبُّ الأعمالِ إلى اللهِ أدومُها وإن قَلَّ».

The user starts with **one dhikr** in the morning and evening. After a period of commitment, the plan adds **one more dhikr**, and this continues until the user reads the full morning and evening adhkar. The plan is **cumulative**: each step contains every dhikr from the steps before it.

The feature name in the interface is **"أدومها"**.

## 2. Rules (all existing app rules still apply)

1. No ads, analytics, tracking or accounts. Everything in this feature is **local to the phone**. Nothing is sent anywhere, so the privacy policy does not change. If you find that something would need to leave the phone, stop and ask.
2. **Never invent** a hadith, source, takhreej, grading or virtue. The only hadith text in this feature is the one given in section 9, with its Dorar data exactly as given. All other text (encouragement, habit tips) is the owner's own words. Mark it as such in code comments, and keep it free of any hadith claims.
3. **The adhkar text is never retyped by hand.** The plan refers to adhkar by their IDs in the content DB. The plan data is produced through the content build, so every change is logged. The Arabic texts in the appendix are **matching keys only**: they are there so you can find each dhikr in the DB. **Never copy them into the app.** The dhikr text and the repeat count always come from the DB as they are.
4. Arabic interface, right to left. Android first.
5. Keep it simple. One person maintains this app. Reuse the existing reader, audio, counting, themes, fonts and notifications instead of building parallel versions.
6. Keep the existing ~400 tests green, and add tests for all new logic (section 12).

## 3. Turning it on and off

- There is a new **"أدومها"** section in Settings, with an on/off switch. It is **off by default**.
- On first launch, and also once after the update for existing installs, the app shows a short, gentle offer to turn it on. The offer explains the idea in two or three sentences and can be dismissed. It must not be shown again after it is dismissed.
- When "أدومها" is **off**, the app looks and behaves exactly as it does today.
- When it is turned off, keep the user's plan data. When it is turned on again, ask whether to **continue where they stopped** or **start over**.
- When the user turns it on, they choose a **starting step**. The default is step 1. Show a clear recommendation: start at step 1, or if they already read some of these adhkar regularly, start at the step that matches and stay there for at least two weeks before adding more.

## 4. The plan

### 4.1 Default plan
The default plan has **24 steps in 4 stages**. Each step adds one dhikr. The full list is in the appendix.

| Stage | Steps | Minimum duration per step |
|---|---|---|
| 1. الأساس | 1–3 | 4 weeks |
| 2. التحصين | 4–7 | 3 weeks |
| 3. الأدعية | 8–21 | 2 weeks |
| 4. الأذكار الطويلة | 22–24 | 4 weeks |

That is about 15 months in total.

- **The opening**, "الحمد لله وحده، والصلاة والسلام على من لا نبي بعده", if it exists as an item in the morning and/or evening category, is the **first dhikr of step 1**. It is always shown first in the ward. It does not count as a separate step.
- A step marked **morning and evening** adds the dhikr to both wards. The DB may have a separate item for each session, with the morning and evening wording variants (أصبحنا/أمسينا، النشور/المصير، هذا اليوم/هذه الليلة...). Link both items to the step.
- A step marked **morning only** or **evening only** changes only that ward. The other ward stays the same during that step.
- Inside a ward, the order is the **plan order**: the opening first, then the adhkar in the order of their steps.

### 4.2 Plan data and matching (do this first, before building any UI)
1. Write a content-build step that finds every plan item in the content DB. Match against the morning category and the evening category of Hisn al-Muslim. Normalize text before comparing: remove tashkeel and tatweel, unify alef forms (أ إ آ ا), ى/ي and ة/ه, remove punctuation, and collapse spaces. Match by containment or close similarity, not exact equality. The surahs (step 4) and Ayat al-Kursi (step 5) can be found by their surah or verse content.
2. Write the default plan into the content DB as **data**: steps, stage, minimum duration, session (morning, evening or both), and the dhikr IDs for each session. Use stable IDs.
3. **Coverage check** (this check must fail the build if it fails):
   - Every plan item matches exactly one DB item per session it applies to.
   - Every dhikr in the morning and evening categories is in the plan exactly once, except items that are clearly not adhkar to be read.
4. **Stop and report to the owner** before continuing. Show a table with: step, session, matched DB ID, the first words of the DB text, and the DB count. List any unmatched plan item and any DB item that is not in the plan. The owner said the morning category has 24 adhkar and the evening category has 22. If your numbers differ, explain why.

### 4.3 Editing the plan
- The user can **reorder steps** with drag and drop, change the **duration of each step** (1–8 weeks), and **reset to the default plan** at any time.
- Each step always adds exactly one dhikr. The user cannot add more than one dhikr per step.
- Before saving any change to the default plan, show a warning. Strongly recommend the default plan and explain that adding too much too fast is the usual reason people relapse. The user must confirm.
- Steps already completed cannot be moved after the current step. Keep this simple.

## 5. Days, sessions and what counts

Morning and evening are **tracked separately**. Each one is a "session" with its own record per day.

**Time settings** (editable in the "أدومها" settings, shown as clock times):

| Setting | Default |
|---|---|
| Morning starts | 04:00 |
| Morning on-time ends | 12:00 |
| Evening starts | 16:00 |
| Evening on-time ends | 00:00 |

**What counts:**
- A morning ward **counts** for date D if it is completed between *morning starts* and *evening starts* on D.
  - Before *morning on-time ends*, it is "on time".
  - After that, it is "late". Late still counts fully. Store the flag, but show it only lightly in history.
- An evening ward **counts** for date D if it is completed between *evening starts* on D and *morning starts* on D+1.
  - So an evening ward completed at 01:30 belongs to the **previous** date.
  - After *evening on-time ends*, it is "late" and still counts.
- The on-time windows decide which card the home screen shows, and the default reminder times.

**What "completed" means:**
- The user finishes **all adhkar of the current ward** in the reader. The ward is the opening plus every dhikr up to the current step, for that session, with the DB counts.
- The existing "إتمام" button and normal completion behavior count too.
- After the ward is completed, offer an optional "أكمل باقي أذكار الصباح/المساء", which opens the full normal category. This is a bonus. It does not change any statistic and must never feel like an obligation.

**"قرأتُها من حفظي":** a button to mark the morning or evening ward as done for **today or yesterday**, without opening the reader. Store it with a "manual" source. It counts the same as reading in the app.

Compute missed days lazily from stored records. Do not depend on the app being opened every day. Handle a changed time zone or clock reasonably: attribute each record by the local time when it was made, and never crash or double count.

## 6. Commitment and moving to the next step

- **Weekly commitment target: 4 of 7 days**, for morning and for evening **separately**. Missing 2–3 days a week is normal and allowed.
- **Condition to move on:** the step's minimum duration has passed **and** in each of the last two 7-day windows, the morning count is ≥ 4 **and** the evening count is ≥ 4. If a step is shorter than two weeks, check only the windows it has.
- When the condition is met, the app **asks**: "جاهز لإضافة الذكر التالي؟", with the buttons "أضِف الذكر التالي" and "أبقِني أسبوعًا آخر". The app never moves on automatically.
  - "أبقِني أسبوعًا آخر" asks again after 7 days.
- If the minimum duration has passed and the condition is not met, the step is **extended by one week automatically**, with a gentle message that has no blame.
- **No streaks** that break, no points, no badges and no sharing.
- Teach the "never miss twice in a row" idea through the tips, not through penalties.

## 7. "طرأ عليّ ظرف أو مستجد في حياتي" (step back on a life change)

Show this as a general button in the "أدومها" settings and on the progress screen. Do not show a list of specific reasons. It opens a sheet with these choices:

1. **Go back to half the current step**: step = max(1, floor(current / 2)).
2. **Go back to the first 3 steps**: step = min(current, 3).
3. **Take a break** of 1 or 2 weeks. Days in a break are excluded from all commitment calculations. Reminders keep working.
4. Cancel.

After a step back:
- Keep all history. Nothing is deleted.
- **Climbing back up is faster.** Any step the user had already reached before gets a minimum duration of **1 week**. With a 1-week duration, the move-on check uses only the last 7-day window. Steps the user never reached before keep their normal duration.

**Gentle suggestion:** if morning or evening commitment is below 50% (fewer than 4 of 7) for two 7-day windows in a row, show the step-back sheet once as a suggestion, with kind wording. The user can dismiss it. Do not show the suggestion again for at least 14 days.

## 8. Screens

**Home** (when "أدومها" is on): a new top card, **"وردك اليوم"**. It shows:
- The current session ward, chosen by time of day, with a button to open it.
- Today's status for morning and for evening: done, done late, or not yet.
- "الخطوة X من 24".

The existing home content (morning and evening cards, favorites, categories, "أذكاري") stays below it, unchanged.

**Progress screen** ("مساري"):
- The current step and stage, with a simple path from 1 to 24 that shows the reached steps.
- The commitment percentage for morning and for evening, over the current step and over the last 4 weeks.
- A week grid: 7 days, each with a morning dot and an evening dot (done, late, missed, or break).
- Time left in the current step, and whether the move-on condition is met so far.
- Buttons: "قرأتُها من حفظي", "طرأ عليّ ظرف أو مستجد في حياتي", and "عدّل الخطة".

**Plan editor:** the list of steps (the first words of each dhikr from the DB, the session, and the duration), with drag to reorder, a duration picker, and "استعادة الخطة الافتراضية".

Follow the app's existing design, themes, fonts and RTL layout. Respect large font sizes.

## 9. Encouragement, prayers and habit tips

People need encouragement, but it must stay sincere: no showing off and no gamification. Show short prayer or praise messages at these moments:

| When | Draft (owner's words; the owner will review) |
|---|---|
| A ward is completed | تقبّل الله منك، وجعله في ميزان حسناتك. |
| Both wards completed in one day | أتممتَ وردَي يومك، ثبّتك الله. |
| End of a week that reached the target | ما شاء الله، حافظتَ على وردك هذا الأسبوع. ثبّتك الله على طاعته. |
| End of a week below the target | كل يوم بداية جديدة، وخطوتك الصغيرة اليوم تكفي. |
| A step is extended | لا بأس، نبقى أسبوعًا آخر حتى يثبت الورد. |
| Moving to a new step | بارك الله فيك، أضفتَ ذكرًا جديدًا إلى وردك. |
| After a step back or break | لا بأس، التراجع المؤقت جزء من الطريق. المهم أن تبقى. |
| Finishing step 24 | الحمد لله، أتممتَ المسار كاملًا. أسأل الله أن يديم عليك ذكره. |

**Habit tips** (one short card per stage, shown when entering the stage, and readable again from the progress screen):

| Stage | Draft (owner's words) |
|---|---|
| 1 | ابدأ صغيرًا: ذكرٌ واحد يأخذ أقل من دقيقة. اربطه بشيء تفعله كل يوم، مثل ما بعد صلاة الفجر وما بعد صلاة العصر أو المغرب. وإن فاتك يوم، فلا تجعله يومين متتاليين. |
| 2 | صار لوردك موعدٌ في يومك، والإضافة الآن أسهل. لكن لا تستعجل؛ الثبات أهم من الكثرة. |
| 3 | الأدعية قصيرة، فأضِفها بهدوء. إن ثقل عليك يوم، فاقرأ ما تستطيع ولا تترك الورد كله. |
| 4 | الأذكار المئوية تحتاج وقتًا؛ خصّص لها وقتًا ثابتًا، ويمكنك ذكرها وأنت تمشي أو تنتظر. |

Put all these texts in one place, such as a single strings module marked "owner-authored, pending owner review", so the owner can edit them easily.

**The hadith card.** Show it on the activation screen and on the progress screen. Use this text and data exactly as they appear on Dorar, and do not change them:

- Text: أَحَبُّ الأعمالِ إلى اللهِ أدْومُها و إن قَلَّ
- الراوي: عائشة أم المؤمنين | المحدث: الألباني | المصدر: صحيح الجامع | الصفحة أو الرقم: 163 | خلاصة حكم المحدث: صحيح
- التخريج: أخرجه البخاري (6465)، ومسلم (783) واللفظ له.
- Link: https://dorar.net/hadith/sharh/113728

Store it the same way the app already stores Dorar data, through the content build if that is the existing pattern.

## 10. Reminders

The reminders stay **separate for morning and evening**, each with its own on/off switch and time, exactly as today.

When "أدومها" is **on**:
- The reminder settings **move into the "أدومها" settings section** and are hidden from their current place. They use the **same stored values**, so do not create a second set of reminders.
- Tapping a reminder opens the **"أدومها" ward** for that session, not the full normal morning or evening category.
- The reminder text may mention the ward, for example "وردك الصباحي جاهز".

When "أدومها" is **off**: the reminder settings return to their current place, with the same values. Tapping a reminder behaves exactly as it does today.

Reschedule correctly whenever the feature is toggled or a time changes. There must never be duplicate notifications. Keep the existing decision: no exact-alarm permission, and a delay of up to an hour is acceptable.

## 11. After step 24

- Show the finishing message.
- The plan moves into a **maintenance mode**. It keeps tracking commitment to the full ward, with the same week grid and percentages, and no more steps.
- Offer, once, the choice to keep "أدومها" on or to turn it off and use the app normally.

## 12. Data, edge cases and tests

**User DB:** add tables through a proper migration. Do not break existing user data.
- Plan state: on/off, current step, step start date, extensions, postponements, breaks and step-backs, and the highest step reached.
- The user's custom plan, if they edited it.
- Session records: date, session, completed at, on-time or late, source (reader or manual).
- Time settings.
- Flags for messages already shown.

**Edge cases to handle:**
- The app is not opened for days.
- The phone clock or time zone changes.
- The user changes the time windows in the middle of a day.
- The user edits the plan while in the middle of a step.
- A content DB update. Plan references must survive it, and the coverage check catches problems.
- A break that overlaps the move-on windows.
- Very large fonts.
- The user turns the feature off and on again.
- Morning-only and evening-only steps.

**Tests** (unit tests for the pure logic, kept separate from the UI):
- Assigning a record to a date and session at the boundaries: 03:59, 04:00, 11:59, 12:00, 15:59, 16:00, 23:59, 00:00, 03:59.
- On-time versus late.
- Weekly counts and percentages, with breaks excluded.
- The move-on condition, including steps shorter than two weeks.
- Automatic extension and "أبقِني أسبوعًا آخر".
- Step-back math and the 1-week re-climb.
- The low-commitment suggestion and its 14-day cool-down.
- Cumulative ward contents per step and session.
- Plan editing constraints.
- Moving reminders on toggle.
- Maintenance mode after step 24.
- The content-build coverage check.

## 13. How to work

1. Read the code and write a **short plan**: files, tables, screens, and the order of work.
2. Do the **adhkar matching (4.2)** and **stop for the owner's approval** of the matching table.
3. Build in small steps:
   - plan data;
   - the logic and its tests;
   - the ward in the reader;
   - home and the progress screen;
   - settings and reminders;
   - step back and editing;
   - the messages.

   Run the full test suite after each step.
4. Ask the owner before any decision this document does not cover. Do not guess about religious content.

---

## Appendix: default plan (the texts are matching keys only)

The texts are written without tashkeel and may differ slightly from the DB. **Never copy them into the app**: the text and the count come from the DB. Counts written as "×N" are only hints for matching. "M" means morning, "E" means evening.

**Opening (first dhikr of step 1, always first in the ward):** الحمد لله وحده، والصلاة والسلام على من لا نبي بعده

### Stage 1: الأساس (4 weeks per step)
1. **M+E**: بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم (×3)
2. **M+E**: رضيت بالله ربا، وبالإسلام دينا، وبمحمد صلى الله عليه وسلم نبيا (×3)
3. **M+E**: اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك، وأنا على عهدك ووعدك ما استطعت، أعوذ بك من شر ما صنعت، أبوء لك بنعمتك علي، وأبوء بذنبي فاغفر لي فإنه لا يغفر الذنوب إلا أنت (×1)

### Stage 2: التحصين (3 weeks per step)
4. **M+E**: سورة الإخلاص، سورة الفلق، سورة الناس كاملة (×3)
5. **M+E**: آية الكرسي، بعد: أعوذ بالله من الشيطان الرجيم: الله لا إله إلا هو الحي القيوم لا تأخذه سنة ولا نوم... وهو العلي العظيم (×1)
6. **M+E**: حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم (×7)
7. **E only**: أعوذ بكلمات الله التامات من شر ما خلق (×3)

### Stage 3: الأدعية (2 weeks per step)
8. **M+E**: أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير، رب أسألك خير ما في هذا اليوم وخير ما بعده، وأعوذ بك من شر ما في هذا اليوم وشر ما بعده، رب أعوذ بك من الكسل وسوء الكبر، رب أعوذ بك من عذاب في النار وعذاب في القبر (×1). The evening variant is أمسينا وأمسى الملك لله... هذه الليلة.
9. **M+E**: اللهم بك أصبحنا، وبك أمسينا، وبك نحيا، وبك نموت، وإليك النشور (×1). The evening variant is اللهم بك أمسينا، وبك أصبحنا، وبك نحيا، وبك نموت، وإليك المصير.
10. **M+E**: اللهم عافني في بدني، اللهم عافني في سمعي، اللهم عافني في بصري، لا إله إلا أنت، اللهم إني أعوذ بك من الكفر والفقر، وأعوذ بك من عذاب القبر، لا إله إلا أنت (×3)
11. **M+E**: اللهم إني أسألك العفو والعافية في الدنيا والآخرة، اللهم إني أسألك العفو والعافية في ديني ودنياي وأهلي ومالي، اللهم استر عوراتي وآمن روعاتي، اللهم احفظني من بين يدي ومن خلفي وعن يميني وعن شمالي ومن فوقي، وأعوذ بعظمتك أن أغتال من تحتي (×1)
12. **M+E**: يا حي يا قيوم برحمتك أستغيث، أصلح لي شأني كله، ولا تكلني إلى نفسي طرفة عين (×1)
13. **M+E**: اللهم ما أصبح بي من نعمة أو بأحد من خلقك فمنك وحدك لا شريك لك، فلك الحمد ولك الشكر (×1). The evening variant is ما أمسى بي.
14. **M+E**: اللهم إني أصبحت أشهدك، وأشهد حملة عرشك، وملائكتك، وجميع خلقك، أنك أنت الله لا إله إلا أنت وحدك لا شريك لك، وأن محمدا عبدك ورسولك (×4). The evening variant is أمسيت.
15. **M+E**: اللهم عالم الغيب والشهادة فاطر السماوات والأرض، رب كل شيء ومليكه، أشهد أن لا إله إلا أنت، أعوذ بك من شر نفسي، ومن شر الشيطان وشركه، وأن أقترف على نفسي سوءا أو أجره إلى مسلم (×1)
16. **M+E**: أصبحنا وأصبح الملك لله رب العالمين، اللهم إني أسألك خير هذا اليوم: فتحه ونصره ونوره وبركته وهداه، وأعوذ بك من شر ما فيه وشر ما بعده (×1). The evening variant is أمسينا... هذه الليلة.
17. **M+E**: أصبحنا على فطرة الإسلام، وعلى كلمة الإخلاص، وعلى دين نبينا محمد صلى الله عليه وسلم، وعلى ملة أبينا إبراهيم حنيفا مسلما وما كان من المشركين (×1). The evening variant is أمسينا.
18. **M+E**: اللهم صل وسلم على نبينا محمد (×10)
19. **M+E**: لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير (×10)
20. **M only**: سبحان الله وبحمده عدد خلقه، ورضا نفسه، وزنة عرشه، ومداد كلماته (×3)
21. **M only**: اللهم إني أسألك علما نافعا، ورزقا طيبا، وعملا متقبلا (×1)

### Stage 4: الأذكار الطويلة (4 weeks per step)
22. **M+E**: سبحان الله وبحمده (×100)
23. **M only**: أستغفر الله وأتوب إليه (×100)
24. **M only**: لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير (×100). Do not confuse this with step 19: they are separate items in the DB, with different counts.
