# Decisions

Decisions made with the owner. The full original brief is in [brief.md](brief.md).
When a decision here differs from the brief, this file wins.

## 2026-10-16 — Rename and new features (before milestone 7)

| Topic | Decision |
|---|---|
| English name | **Wirduk** (was Wirdak). The Arabic name stays وِرْدُك. |
| Package id | **`com.wirduk.app`** (Android and iOS). Scheme `wirduk://`. |
| Repos | Source repo renamed `wirdak` → **`wirduk`** (GitHub keeps redirecting the old URL). The audio repo will be **`wirduk-audio`**. |
| Vibration | A **long vibration when a whole category is finished**, with its own setting (on by default). The light tap per count keeps its own setting. |
| Tick sound | A short tick on each count, **off by default**, with its own setting. The owner chose **Kenney "Interface Sounds" `click_005`** (CC0) on 2026-10-17. Details in `assets/sounds/SOURCES.md`. |
| Custom adhkar | Users can add **their own categories and adhkar**. Shown in a section **below the favorites** (not in the main list), in a **slightly different color**. Stored in `user.db`, so content updates never touch them. Custom adhkar live **only in custom categories**. A custom dhikr has: text (with tashkeel), count, optional fadl and source notes, and optional audio (recorded in the app, or picked from a file). Everything original categories support works for them too: reading, counting, favorites, search, order, completion. |

## 2026-10-16 — Plan review

| Topic | Decision |
|---|---|
| Package id | `com.wirdak.app` — replaced by `com.wirduk.app` (see rename above) |
| Builds | Local Android builds now. EAS cloud builds later for iOS. |
| Test device | Android emulator now, a real device later. |
| Git | Commit and push to the source repo (now `wirduk`) after each milestone. No AI attribution in commit messages. |
| Morning / evening | Split the source's single "أذكار الصباح والمساء" category into **two separate categories**. They may be customized later, so they stay fully independent (own rows, own order, own counts). |
| Swipe | Swiping the dhikr screen moves to the next / previous dhikr in the same category. |
| Tests | Full test suite (unit + component, E2E later) and one `npm run verify` command to run before every release. |
| Source text | Tashkeel is kept exactly as in the source. Unicode "presentation form" characters (PDF copy artifacts such as `ﻟﻤ`) are replaced by the normal letters. Real typos (e.g. `مترلا`) are fixed **only** when Dorar shows the correct wording. Every change is logged in `docs/content-changes.md`. |
| Audio repo | `wirdak-audio` — replaced by `wirduk-audio` (see rename above). Public, GitHub Pages. |
| Fadl | Shown only after the owner approves each one in `docs/sources-review.md`: an exact quote from the Dorar hadith text, or (since 2026-10-17) the owner's own words. |
| Dorar access | dorar.net blocks scripts (Cloudflare 403). Searches run from a real Chrome tab, with the owner's OK. |
| Logo | Replaced on 2026-10-17 by the owner's new design in `wirduk-logo/` (light and dark SVG, PDF, EPS, PNG). The old `wirdak.jpg` and `wirdak-logo.png` were removed (still in git history). |

## 2026-10-16 — Design review (milestone 4)

Design direction "paper and ink" in [design/proposal.html](design/proposal.html) is approved, with:

| Topic | Decision |
|---|---|
| Home | The logo next to "وِرْدُك" (since 2026-10-17: the round logo from `wirduk-logo/`, light or dark to match the theme). |
| Default dhikr font | **Amiri Quran** (OFL-1.1). KFGQPC only if written approval from the Complex comes later. |
| Numbers | **Western digits** (23). Layout and text direction stay RTL. Never format numbers with an `ar` locale (that gives ٢٣). |
| Morning / evening | The one that fits the time of day comes first on Home, marked "الآن". |
| Multi-step items (31:1, 118:1, 124:1) | Keep a count of 1 (one tap after all steps). |
| New feature | "الإبلاغ عن مشكلة" at the end of Settings: description, several screenshots, app/device details shown before sending, creates a GitHub issue. |
| Report delivery | **The app sends it** through a small free relay (Cloudflare Worker) that holds the GitHub token and creates the issue with the screenshots in a **private** repo. No GitHub account needed for the reporter; nothing is sent before they tap "إرسال". Needs: a free Cloudflare account (owner), spam limits, and a privacy-policy section. Built in the audio/GitHub milestone; ask before creating anything external. |

## 2026-10-17 — Sources from Dorar (milestone 8)

| Topic | Decision |
|---|---|
| How searched | From a dorar.net tab in the owner's Chrome (with the owner's OK): the page's own search, one request at a time with pauses. Results were saved word for word to local files; nothing was typed by hand. 310 searches for 267 distinct adhkar (morning/evening pairs share one). |
| Automatic source | Only when a Dorar narration has ≥ 90% of the dhikr's words in order (5+ in a row), is graded sahih or hasan, and nothing below applies. Preference: al-Bukhari / Muslim, then sahih, then hasan; Dorar's general tab and the "صحيح …" collections first. |
| Never automatic | Phrases of 4 words or fewer (they appear in many hadith). Words narrated by 4+ Companions in different hadith (a common formula). Gradings with a caveat ("ولكن", "دون", "علة", "غير ثابت", …) or from books of weak/defective hadith. Quran recitations (the hadith about reading them does not contain the verses). These go to the owner, with up to three Dorar options ranked by the book's context. |
| Checked by hand | Every match of 9 words or fewer, every match narrated by 2–3 Companions, and every grading text. Four automatic picks were corrected by reading the Dorar texts (117001, 98001, 133023 to the narration that fits the chapter; 1009 to the owner). |
| What the app shows | "المصدر: <book> (<number>) — الراوي: <narrator>" and "الحكم: <grading> — <scholar>", for the chosen narration only, plus a link to it on Dorar. When Dorar names no narrator ("-"), the narrator part is left out. Other scholars' verdicts are listed for the owner in `docs/sources-review.md`, not shown in the app (a verdict on another narration could mislead). |
| Fadl | An exact quote cut from the Dorar text by the build tools (never typed), shipped only after the owner approves it. |
| Evening wording | Only words that Dorar gives in the evening form, quoted exactly, after approval. For 133006, 133007 and 133015 Dorar gives no evening words (the hadith say "say it in the evening too"). See the owner's decisions below. |
| Result | 190 of 287 adhkar have a source (content v3). 97 wait for the owner, grouped by reason. |

## 2026-10-17 — Owner decisions on the sources (content v4)

The owner answered every item in `docs/sources-review.md`. The answers are applied by the
build from `content-source/dorar-sources.json` and `content-source/overrides.json`.

| Topic | Decision |
|---|---|
| Sources | 270 of 287 adhkar have a source (content v5). Short phrases and formulas use the option the owner picked; for 16 adhkar the owner gave their own Dorar link (read in Chrome and saved word for word, like the searches). |
| No source | 17 adhkar show no source, by the owner's choice (listed in `sources-review.md` §7). 45002 (الأذان) keeps its text, with no source. |
| Later answers | 27003: Muslim 594, the owner's link after seeing the full text. Nothing waits for the owner. |
| Weak gradings | Some sources the owner chose are graded weak on Dorar (1024, 11001, 12001, 17001, 125001). The app shows the grading as Dorar gives it. |
| Other scholars | Shipped sources where another scholar calls the hadith weak are kept. |
| Fadl | 11 shown. 6 are exact Dorar quotes. 5 (7002, 14001, 70001, 81001, 104001) are the owner's own words, with الدعاء in place of the dhikr's words; the build marks them `by: "owner"` and does not check them against Dorar. 1006 uses the narration the owner chose (أعتقه الله من النار). 1007 shows no fadl. Two typing slips in the owner's text were fixed: "ذَنبِهز" → "ذَنبِه." (ز is the "." key on an Arabic keyboard) and "ثمَّ وقال" → "ثمَّ قال". |
| Evening wording | The evening category uses the evening words; the morning category keeps the morning words. 133003, 133004 and 133016 use the words from Dorar (W1–W5). 133006, 133007 and 133015 use the owner's words; the rest of 133015 comes from the book's own evening note. In 133015 the word الملك keeps the book's marks (الْمُلْكُ, not the typed الْملكَ), since only the verbs change. The bracket notes are removed from the evening text. |
| Audio | The evening adhkar still play the same recordings as the morning ones. The six whose words changed are listed with their recordings in `content-review.md` §E, for the owner to check. |

## 2026-10-17 — Counting (tested on the owner's phone)

| Topic | Decision |
|---|---|
| Leaving the reader | Resets the counts of that category. Opening it again (also after the completion screen) starts from zero. Was: kept until the app closed. |
| "إتمام" button | In the row above the text, next to the play button: fills the current dhikr's count and moves on, as if the last tap was made. Disabled when the dhikr is already complete. Kept out of the tap zone so a counting tap never presses it. |
| Audio repeat | A recording plays as many times as the dhikr's count (owner request: سبحان الله وبحمده → 100 times), shown as "التكرار N من M". Autoplay moves on after the last repeat. |
| "العدّ مع الصوت" | A setting (Settings → الصوت), **off by default** (owner decision). Off: the audio is for listening; only taps count. On: each finished play counts once, the recording plays only the times still left (after hand counting), and when the count is reached the reader moves on as after the last tap, and the next dhikr's audio starts (with autoplay on). The "التكرار" line is hidden then: the counter shows the progress. |

## 2026-10-22 — Owner feedback (content v6)

| Topic | Decision |
|---|---|
| Opening dhikr | "الْحَمْدُ للهِ وَحْدَهُ، وَالصَّلَاةُ وَالسَّلامُ عَلَى مَنْ لاَ نَبِيَّ بَعْدَهُ" (the owner's own words, not in the book; corrected by the owner the same day, content v7; "نَبِيَّ" with its shadda from 2026-10-23, content v8) comes first in the morning (1901) and the evening (133901). Count 1, no source, no audio yet (the owner will send audio). Added adhkar use positions 900+ (`overrides.json` → `addedAdhkar`). |
| Quote marks | The book's (( )) are removed from every dhikr at build time (`scripts/content/lib/quote-marks.ts`, 241 adhkar). Single parentheses (notes such as "(ثلاث مرات)") stay; a "))" that closes two notes stays. |
| Next-dhikr vibration | Setting, on by default: 200 ms (Android; a heavy tap on iOS) when the reader moves on. Between a count (light tick) and a finished category (600 ms). |
| Keep the screen on | Setting, on by default, while the reader is open (`expo-keep-awake`). |
| Rotation | The app follows the phone's auto-rotate (`orientation: "default"`). In landscape the reader shows the text and the counter side by side; the completion screen scrolls. The pager is made again each time its measured width changes (2026-10-23 fix: going back to portrait left the page shifted to the side). |
| Dorar link | A tap on "عرض في الدرر السنية" counts like any tap and shows a toast "للعرض في الدرر السنية اضغط هنا" for 4 s; pressing the toast opens Dorar. Counting goes on meanwhile. TalkBack's "activate" opens Dorar directly (deliberate). |
| Tick sound | Louder: soft-shaped, peak −0.3 dBFS, RMS −7.8 dBFS (was −19.2): `assets/sounds/SOURCES.md`. |
| Continue where I stopped | Setting, **on by default**. When the app goes to the background in the reader, it saves the category, the dhikr on screen and the counts (`user.db` → `SavedSession`), and forgets them when the app comes back. On a fresh start within 5 hours it reopens the reader there with the counts and shows "استُعيدت آخر حالة، ويمكنك إيقاف ذلك من الإعدادات" (pressing it opens Settings). Older than 5 hours, or the setting off: a fresh app. A saved state is used once. |
| Audio with the screen off | Bug: with "العدّ مع الصوت" the reader waited on a JS timer and on the pager's event before playing the next dhikr; with the screen off Android holds both until the screen is on. Now, in the background, the reader moves at once and the next recording starts directly; page events that arrive late are ignored when out of date. |
| Line breaks (content v7) | Owner chose option a: each part of a long dhikr on its own line. Before each "بسم الله الرحمن الرحيم" that is not first (the surahs of 1002, 2001, 27005), between the isti'adha and the verse (1001), before "ثُمَّ" right after a verse (2001), and the steps of 31001. The dashes of 28001 are side notes and stay. `scripts/content/lib/line-breaks.ts`, rule `lineBreaks` in `overrides.json`. |

## 2026-10-23 — Milestone 9: reminders, report an issue

| Topic | Decision |
|---|---|
| Reminders | Settings → "التذكير": morning (default 6:00 ص) and evening (default 5:00 م), each with a switch and a time (tap the time: the Android clock picker, 12 hours). **Both off by default.** Daily **local** notifications (`expo-notifications`, `DAILY` trigger): no push, no server. A tap opens category 1 or 133, and wins over "continue where I stopped". The permission is asked only when a reminder is turned on; if refused, the switch stays off and a toast leads to the phone's app settings. The Android channel "التذكير بالأذكار" is made only when a reminder is first used. |
| Reminder timing | No exact-alarm permission (`USE_EXACT_ALARM` is for alarm and calendar apps only on Google Play; `SCHEDULE_EXACT_ALARM` is off by default on Android 14+), so Android may send the reminder late to save battery: its window is up to **1 hour** after the time (seen in `dumpsys alarm`: `window=+1h`; on the emulator, a reminder 4 minutes ahead came 2 minutes late). Settings says it may come "a little" late. Exact timing would need the user to allow "Alarms & reminders" for the app: a question for the owner. Reminders come back after a phone restart (`RECEIVE_BOOT_COMPLETED`, from the library). |
| Report an issue | Settings → الدعم → "الإبلاغ عن مشكلة" (the row shows only when `APP_CONFIG.report.endpoint` is set). A description (10–4000 characters), up to 4 screenshots, and the app/device details listed on the screen with a switch to leave them out. Nothing is sent before "إرسال". |
| Screenshots | Picked with the document picker (`image/*`, no permission). `expo-image-picker` was not used: it adds the camera and storage permissions. Each picture is made smaller in the app (`expo-image-manipulator`: JPEG, 900 px wide, quality 0.7, then 0.45 if still over 1 MB) so the relay stays fast and cheap. |
| Details sent | App version, content version, Android version, phone maker and model, app language, theme, dhikr font and size. From 2026-10-23 also (owner's request, after reports#2 could not be reproduced): screen size in px and dp, the phone's text size (font scale, %), free storage. No name, no id, no location, no account. New detail names need the relay deployed first: it refuses unknown ones. |
| Relay | A Cloudflare Worker (`workers/report/`, free plan) holds a fine-grained GitHub token (Contents + Issues, on the private `wirduk-reports` repo only). It saves each screenshot as a file in that repo and opens an issue that links them. The report format and limits live in one file that the app and the Worker share (`src/features/report/report-protocol.ts`). |
| Reports repo | `TameemHabash/wirduk-reports`, private, separate from the code (owner's choice, 2026-10-23): `wirduk` may become public, the token needs write access only there, screenshot commits stay out of the code history. A real bug can be moved to `wirduk` with "Transfer issue" (both private), or closed from a commit with `Fixes TameemHabash/wirduk-reports#N`. Since 2026-11-01 `wirduk` is public: GitHub does not transfer an issue from a private repo to a public one, and a report holds the user's screenshots and details, so write a new `wirduk` issue in your own words instead. |
| Times said per recording | Owner's idea (2026-10-23): a recording may say the dhikr several times (e.g. 4 for سبحان الله وبحمده, count 100: 25 plays). `overrides.json` → `audioRepeats` by file name; default 1 for every recording until the owner gives the numbers with the new audio. The build fails, and a test fails, if a count is not a whole multiple. Listening: plays = count ÷ times. "العدّ مع الصوت": each play counts that many, never above the count; after counting by hand the plays left are rounded up, so the last play may say it more often than it still counts (e.g. 7 left, said 4: plays count 4, then 3): the dhikr is always said at least the full count (owner agreed, 2026-10-23). The user's own recordings say it once. Content v9 (new column `AudioFiles.Repeats`). |
| About: sources | The content box names Dorar: "مصادر الأحاديث وفضلها من موقع الدرر السنية." (owner, 2026-10-23). |
| Spam limits | Body ≤ 6 MB, the checks above (only JPEG/PNG, only known detail names), 2 reports a minute per IP and 10 a minute in total (Cloudflare rate limiting, approximate). Issue text: @mentions and HTML are made harmless. Cloudflare logs are off; the Worker stores nothing. |

## 2026-10-23 — Adwamuha (أدومها), milestone 10: the owner's decisions

The description is `docs/adwamuha/feature-prompt.md`; these answers win over it.

| Topic | Decision |
|---|---|
| Default plan | 24 steps, as in `docs/adwamuha/matching.md`, with one change: **step 23** (أستغفر الله وأتوب إليه ×100) is **morning and evening** (1022 / 133022), not morning only. Every morning (24) and evening (22) dhikr is in the plan; none left out. |
| Where the plan lives | The content database keeps only the **default** plan. When the user turns the feature on and confirms the plan (or edits it), the app saves **the user's own copy** in the user database with the progress, and uses only that copy. "Reset to the default plan" copies it again. |
| 7-day windows | The last 7 days, today included. Today counts once read; it is never "missed" before it ends. |
| Starting at step N | Steps 1…N count as already reached (a later step back climbs them in 1 week each). |
| Home card | 12:00–16:00: the morning ward if not done (late), else the evening ward ("starts at 4:00 م"). 00:00–04:00: yesterday's evening ward if not done (late). |
| What counts | Finishing the full morning / evening category also counts as the ward. A partly read ward does not count. «قرأتُها من حفظي» can be undone for today or yesterday. |
| Message library | `content-source/adwamuha-messages.json`, written only by `scripts/adwamuha/messages.ts`. Verses: whole verses (1–5 in a row) from the Tanzil Uthmani text 1.1, verbatim, with Tanzil's surah name; shown in the Amiri Quran font. Tanzil's terms: no change to the text, and the app names Tanzil Project with a link to tanzil.net. Hadiths and athar: saved Dorar pages, graded صحيح or حسن as a word on its own (not "أخرجه في صحيحه" or "رجاله رجال الصحيح"). Every entry is a candidate until the owner approves it (all 63 approved, 2026-10-24). In the app: one message per moment from the owner's own message plus the library's for that moment, picked by a hash of the occasion (a day's ward, an event, a week), so it never changes on screen and varies between occasions. Verses: Amiri Quran, the end-of-verse sign with its number between verses, "[surah: verses]" below. Hadiths: Dorar's fields and a link. A new step and a step back / break show in the message card on Home and «مساري» (only today or the day after), not in a toast. |
| Begun in the evening | Found in the emulator pass (2026-10-24): when the plan, or a new step, begins in the evening window, that day's morning was already over. It counts for nothing (not done, not missed): "—" in the grid, left out of the percentages, not held against the 4 of 7. Saved in the plan state (`stepStartedIn`, `planStartedIn`); older data counts it as before. |
| No «read the rest» | Owner, 2026-10-24 (wins over the description's «أكمل باقي أذكار الصباح/المساء»): the feature is small, steady and growing, so nothing in it offers the rest of the morning / evening adhkar. After a ward, a gentle line asks the user to stop at the ward today, even if they can read more: that makes the habit stronger. The normal categories stay on Home as before; the ward screens just do not point to them. |
| Moving on | «جاهز لإضافة الذكر التالي؟» shows once on the day the condition is met (when the app opens), then stays on «مساري» until answered; never automatic. The automatic extension repeats week by week. |
| Breaks and off days | Break days count neither for commitment nor for the step's time (the step pauses); a break can end early. Days with the feature off are treated like a break. |
| Plan editing | The current step and the ones before it stay in place; only later steps can be reordered. The current step's weeks can change. |
| Messages | "End of a week" = every 7 days from the start of the step. |
| Reminders | Unchanged: they come every day, even when the ward is already read (reliable even if the app is not opened for weeks). |
| Light plan notice | On activation, before saving a plan change, and on «مساري»: the default plan is light on purpose, with the hadith «أحبُّ الأعمال إلى الله أدومها وإن قلّ» exactly as on Dorar. |
| The hadith card | Owner, 2026-10-25: the card shows the owner's text of the hadith and the owner's own source line «صحيح البخاري ومسلم», and no Dorar link or Dorar data. Both cut from the owner's message into `docs/adwamuha/owner-edits.json`, applied by `scripts/adwamuha/owner-texts.ts`. (Dorar, checked 2026-10-24: Bukhari 6465, Muslim 783.) |
| Explaining the feature | A short explanation screen on the first launch of a new install and when turning the feature on; nothing after an update. The «أدومها» section is prominent in Settings. The text is drafted for the owner's review. |
| Encouragement | Must be religiously sound and approved by the owner, one by one, and varied (about 10 per moment, picked at random). Hadiths and athar only from Dorar (graded صحيح or حسن), saved with `scripts/dorar`; verses copied by script from the tanzil.net text (download approved by the owner), with surah and verse number; short prayers in the owner's own words. Nothing from memory. |

## 2026-10-29 — Adwamuha redesign (milestone 10b): the owner's decisions

The owner's design is `docs/adwamuha/flow-design.html`; these answers and notes win over it and
over the 2026-10-23 decisions where they differ.

| Topic | Decision |
|---|---|
| Weeks | Calendar weeks that start on the phone's own first day of the week (its region settings; since 2026-10-30 the «بداية الأسبوع» setting, Saturday by default), for everything: the week grid, the goal bars and the move-on rule. Rule: the last 2 full weeks of the step each have 4 mornings and 4 evenings; a week cut by the step's start or by a break does not count. The numbers always match the dots. (Before: the last 7 days, rolling.) |
| Setup screens | Three screens (the feature, where to start, reminders) on the first launch, and once after each app update while Adwamuha is off; «لاحقًا» hides them until the next update. Never while it is on. (Before: first launch of a new install only.) |
| Move-on question and suggestion | «جاهز لإضافة الذكر التالي؟» and «هل تريد أن تخفّف وردك؟» show in «وردك اليوم» on Home, in the one-time message place, with their buttons; the move-on question also on «مساري» above «تتبّع الأسبوع» until answered. |
| Recording outside the app | «قرأتُ وردي بدون التطبيق» lists only today's and yesterday's wards not recorded; a tap records. Undo stays: tap a ✓ you recorded yourself (today or yesterday), after a short confirmation. |
| The hadith | No source line anywhere (replaces «صحيح البخاري ومسلم» of 2026-10-25); its Dorar data stays stored. A shadda on «الله» (owner). |
| Backup card | Leaves the start (setup) screens; «احفظ مسارك» lives in the «أدومها» settings screen, with Claude's own text (the design's text was not logical). |
| A later starting step | Gets 2 weeks (it is already practised), not its full time. |
| «مساري» | No commitment percentages and no «لماذا خطة خفيفة؟» box; the hadith is featured; the stage tip is a fixed card; one-time messages only on Home. |
| Both wards done | Home ~~and the finish screen~~ show only the owner's prayer, no verse or hadith and no button. (2026-11-01: the finish screen shows the usual message again, see below.) |
| Messages | Each {{placeholder}} of the design is stored in the database with the other encouraging messages and chosen by state. `ward_count` is counted, not stored. The design's `morning_message`, `evening_message`, `break_message` and `completion_message` are shown nowhere in it: left out. The welcome text fits a start at step 1; a later start and the morning get their own variants (Claude's drafts, for review). «النية لكل يوم» stays in the setup's "4 of 7" line. |
| «ترتيب الورد» | Plan order (default, «ننصح به»): the opening, then the steps' adhkar, the new one last. Category order: the same adhkar of the ward, in their order in the morning / evening category. Only the order changes, never the content or the progress. Stored in user.db. |
| Logo | The app's current logo, not the design's. |

How the week rule works in detail (Claude, step 2, following the rule above):

- A week is **full** when its 7 days are all in the step, none is paused, and it holds no first
  morning that was already over when the step began (a step begun in the evening cuts its week
  like a start in the middle of the week). A cut week is neither met nor missed. A missing
  morning is never counted as done (before: it counted toward the 4 of 7), so the bars match the
  dots.
- A full week that already has 4 mornings and 4 evenings counts before it ends.
- When the minimum time has passed but the full weeks the rule needs are not over yet (the step
  began inside a week), the app waits for them; it extends the step only when those weeks are
  over and short of 4 and 4.
- The suggestion to lighten the ward looks at the last 2 full weeks that are over. The
  end-of-week message comes at the end of each full week (none for a cut week).
- ~~When the phone does not say its first day of the week, Saturday.~~ Since 2026-10-30 the
  first day is the «بداية الأسبوع» setting (Saturday by default), not the phone's.

How the messages work (Claude, step 3):

- The owner's 8 messages and 4 tips, the design's maintenance tip and the welcome are rows of
  the content table `AdwamuhaTexts`, each with its moment and state, cut by script
  (`scripts/adwamuha/owner-texts.ts`). The script refuses a design whose copy of an owner's text
  (the stage tips, the both-wards prayer) differs from the description.
- The welcome shows once, on the day the feature is turned on or the next day. It has 4 states:
  step 1 or a later step, and the ward open then. Step 1 is the design's text; the morning
  variant only changes the ward's name (by script). A later start keeps the design's first and
  last sentences around Claude's middle sentence («بدأتَ من حيث وصلت، وبعد أسبوعين من الثبات
  يُضاف ذكرٌ جديد.»), for the owner's review.
- After the last step, the maintenance tip takes the place of the stage tip.
- Both wards done: only the owner's prayer, ~~also on the finish screen (no library message, no
  «stay with your ward» line)~~ on Home. Since 2026-11-01 the second ward's finish screen is the
  same as the first's.

How the setup works (Claude, step 4):

- Its texts are the design's, cut into `common.json` (`adwamuha.setup`) by
  `scripts/adwamuha/design-strings.ts`; the 4-of-7 line starts with the owner's «النية لكل يوم»
  (kept in `docs/adwamuha/owner-edits.json`).
- "Shown" is kept per app version and build number (`setup:<version>+<build>` in user.db).
- Turned off before: «فعّل أدومها» asks to continue or start again, as Settings does. The
  Settings switch, the first time, opens setup 1.
- The ward preview: every dhikr of the chosen step (owner, 2026-10-30, below).
- Notifications refused at «ابدأ مساري»: the reminders stay off (a note says so) and the path
  still begins.

Home and «مساري» (Claude, steps 5–6):

- The one-time place in «وردك اليوم» shows a message due first (once, tied to what just
  happened), then the move-on question, then the gentle suggestion (both stay until answered).
- «قرأتُ وردي بدون التطبيق» lists only wards whose time has begun (not tonight's evening in the
  morning). A ✓ the user recorded (today or yesterday) asks «إلغاء التسجيل؟» before undoing.
- The goal bars show only for a full week; a week the step began in (or a break cut) shows the
  design's «هدفك…» line instead. The stage line uses ordinals (Claude's words: المرحلة الأولى…).

## 2026-10-30 — Adwamuha feedback (10c): the owner's decisions

The owner's words are cut from their message by script (`docs/adwamuha/owner-edits.json`).

- Setup: the numbers are rounded squares; «ابدأ من أول خطوة» (imperative, not the design's
  «أبدأ»); setup 2 shows every dhikr of the chosen step, so the user knows what the step holds.
- «آية الكرسي» and «الإخلاص والمعوذتين» show by these names instead of their first words, in the
  setup preview and in the ward order (only these two).
- A setup screen for «ترتيب الورد», as in the settings: the whole ward first, a button to show only
  the first four. In the settings it is the other way: the first four, a button to show all. The
  section moved under «الخطة», before «احفظ مسارك». «ننصح به» is a badge.
- The section's text is the same size as the other settings: the notes smaller than the titles.
- Home: «الصباح والمساء» above the quiet morning and evening cards.

- «بداية الأسبوع» (the updated design): a setting in «أدومها»'s settings (Friday, Saturday,
  Sunday, Monday; Saturday by default), the only source of the week's first day (the phone's
  region is no longer read). A change applies at once, from the stored days.

- Audio: the user sees only "download the morning and evening recordings", with its size;
  "download every recording" stays in the code, hidden. The size follows the new recordings.
- «مساري»: a line before the week's goal.

Claude's choices:

- The morning and evening download takes the recordings of the morning and evening categories
  (24 files: most evening adhkar share the morning recordings). «حذف الصوتيات المحمّلة» still
  removes every recording on the phone, and shows whenever there is one (also one downloaded by
  playing it). The line before the goal is also there above the first week's sentence (the
  design's `.goal` has it in both).
- After a change of «بداية الأسبوع», the week that just ended on the new days brings no
  end-of-week message (it would repeat the one just seen). The move-on rule and the suggestion
  follow the new weeks at once (as the design says), so a change can make the move-on question
  come or go.
- The order screen is setup 3, right after choosing the step (its preview is that step's ward);
  the reminders stay last, with «ابدأ مساري». The choice is saved at once (the same setting as
  the settings screen).
- The buttons' words are Claude's: «عرض الورد كله (N)» and «عرض أول أربعة».
- Short multi-word labels that are as wide as Android measured them get extra room (the
  Settings row's value, the badge, the title next to it), so the Galaxy S21+ does not cut their
  last word.

## 2026-10-31 — New recordings (milestone 11)

The owner's decisions:

- New recordings for the morning and evening adhkar, from the owner's sheet
  (`docs/audio/morning-evening-audio.csv`): the morning order, one recording when the evening says
  the same words, and their own for the 7 said only in the evening.
- The files are m4a: "convert them without losing quality" if needed.

Claude's choices:

- Not converted: any m4a → mp3 conversion loses a little quality (both compress). The app plays
  m4a (AAC) as it is; a recording's name keeps its extension (`1001.m4a`), the book's keep none
  (`.mp3`).
- Named after the dhikr's id in the app; the old mp3 files stay on the site, so older app
  versions (with the old sizes) keep working.
- Downloaded recordings no dhikr plays any more are deleted when the app starts.

«العدّ مع الصوت» is on by default (owner, 2026-10-31; off since 2026-10-17): each finished play
counts, and the reader moves on when the count is done. A phone where the user set it keeps
their choice.

The audio and the count (owner, 2026-10-31: "when audio does not count, it just goes to the next
dhikr"): with «العدّ مع الصوت» off, the recording plays its plays, then the reader waits on the
dhikr (it used to move on with the dhikr not counted). When the user finishes it (taps or
«إتمام») while listening (playing, or its plays just ended), the reader moves on and the next
recording plays (with «التشغيل المتتابع»); after a pause, nothing plays. A swipe stops the audio,
as before. With «العدّ مع الصوت» on, nothing changed.

## 2026-10-25 — Backup (milestone 12): the owner's decisions

| Topic | Decision |
|---|---|
| Kind | Both: Android's automatic backup (to the user's own Google Drive), fixed to fit, and a backup file the user saves and restores. No Google sign-in in the app: it would need a Google Cloud project, Google's review, a sign-in screen, internet and a privacy change, for no extra safety. |
| Automatic backup | Only the small data (`user.db`, the backup dates): never the content database or audio, so it stays under Android's 25 MB limit (above it Android skips the whole backup). |
| Restore | Replaces all the data (no merge), after a safety copy of the current data on the phone. |
| Recordings | The user's own recordings are in the backup file (they cannot be downloaded again), not in the automatic backup (size). |
| Where it shows | Owner, 2026-10-25: Settings → «النسخ الاحتياطي» just before «الدعم»; and the «أدومها» start screen has «احفظ مسارك» (keep your path safe). When Android's backup looks off (never, or not for 30 days: an app cannot ask whether it is on), both offer «تفعيل النسخ الاحتياطي في الهاتف», which opens the phone's backup screen (stock Android's `com.android.settings.BACKUP_SETTINGS`, Google's opt-in on Google phones; the main Settings on a phone without it, with "search for «النسخ الاحتياطي»"). An app cannot turn backup on itself. |
| The file | `wirduk-backup-YYYY-MM-DD.wirduk`, a SQLite database (a `VACUUM INTO` copy of `user.db` + `BackupMeta` + `BackupRecordings`). This phone's own tables (downloaded audio, the reader's last session) stay out of it and are kept on restore. A file from a newer app is refused ("update the app first"). The date counts when the share sheet was offered (Android cannot tell whether the user really saved it). |
| Reminder | Settings shows the last backup dates. A gentle note on Home when Android never backed the app up or not for 30 days (Android does not tell an app whether backup is on; a small backup agent records each backup), unless a backup file was saved in the last 30 days. |

## 2026-11-01 — Owner feedback

| Topic | Decision |
|---|---|
| The day's second ward | Its finish screen is the same as the first ward's: an encouraging message (the owner's words, a verse or a hadith) and «اكتفِ اليوم / الليلة بوردك…» (owner's option ب, after screenshots of both screens). The owner's prayer for both wards («أتممتَ وردَي يومك، ثبّتك الله.») stays on Home only. |

## Technical choices (milestone 0–1)

| Topic | Choice | Why |
|---|---|---|
| Expo SDK | 57 (React Native 0.86) | Latest stable. SDK 58 is still beta. |
| Drag & drop | `react-native-reorderable-list` instead of `react-native-draggable-flatlist` | The suggested library was last released May 2025 and has known problems with Reanimated 4. The replacement is maintained and FlatList-based. |
| Swipe between adhkar | `react-native-pager-view` | Native pager, supports RTL. |
| Layout direction | Derived from the language: `app.config.ts` reads `DEFAULT_LANGUAGE` and sets `forcesRTL` in the `expo-localization` plugin. `syncLayoutDirection()` handles a future runtime language change. | Not hard-coded, and no reload on first launch. |
| Content vs user data | Two SQLite files: `content-v{N}.db` (shipped, read-only, swapped when the version goes up) and `user.db`. | A content update can never touch user data. |
| Closing the content database | Opened with `finalizeUnusedStatementsBeforeClosing: false`. | `PRAGMA quick_check` makes the FTS5 search table prepare its own statements. expo-sqlite's default finalizes every statement before closing, then SQLite finalizes FTS5's again: a double free (native crash) when an invalid copy is closed to be copied again. Found 2026-10-17. Our queries finalize their own statements. |
| Tests | Jest with two projects: `logic` (Node, can use Node's built-in SQLite with FTS5) and `ui` (jest-expo + Testing Library 14). | Real SQL and FTS queries are tested, not mocks. |
| Audio used by the app | Only the 267 files used by single adhkar (≈116 MB). The other 130 files (whole-category recordings, ≈68 MB) are hosted but not used. | Sequential autoplay already plays a whole category. |
| Audio files hosted | **397**, not 398: the source has `ar_7esn_AlMoslem_by_Doors_053` twice (with and without `.mp3`), byte for byte the same. The manifest script skips such an exact copy and stops if the two ever differ. Files are otherwise unchanged (no re-encoding). | No duplicate on the site; no guessing which copy is right. |
| Audio downloads | One file on first play; "download all" 3 at a time with stop / continue; free space checked first (20 MB kept free); a file is kept only with its exact expected size. | A cut download or an error page can never be played as a recitation. |
| Leaving the reader | Stops the audio. | The player belongs to the reader; background playback is for the screen being off, not for browsing other screens. |
| Own adhkar ids | Negative ids (`-rowId`) for the user's categories and adhkar. | One id space for routes, counters and favorites, with no clash with content ids and no extra "kind" field everywhere. |
| Own audio | Copied into the app's own folder (`custom-audio/`), never linked to the original file. Picked files are limited to 50 MB. | The original file may be moved or deleted; the app's copy is private and is removed with the dhikr. |
| Own adhkar colors | Sand tokens (`customSurface`, `customBorder`, `customAccent`). In the reader the card stays on the normal surface with a sand border and label. | Faint text on the sand surface was below WCAG AA (4.29:1), so the long text stays on the normal surface. Tested in `colors.test.ts`. |
| Tick level | Set in the sound file (× 0.6), not in code. | `expo-audio` has no volume option in `useAudioPlayer`, and setting it afterwards breaks the React rules. |
| Long vibration | React Native `Vibration` (600 ms on Android). | `expo-haptics` has only short effects. |
| Icons and splash | Built from the logo SVGs by `npm run branding:build` (`@resvg/resvg-js`, dev only). Android adaptive icon: logo scaled to 80% so it stays inside the visible circle; one-color version for themed icons. Splash: the light logo on the light background, the dark logo on the dark one. | One command when the logo changes; no hand-made image files. |

## Fonts and licenses (checked 2026-10-16)

| Font | License | Can we ship it? |
|---|---|---|
| KFGQPC Uthmanic Script Hafs | Proprietary: "may not be reproduced, modified without the express written approval of King Fahd Glorious Quran Printing Complex" | **No**, not without written approval from the Complex. |
| Amiri, Amiri Quran | OFL-1.1 | Yes |
| Scheherazade New | OFL-1.1 | Yes |
| Noto Naskh Arabic | OFL-1.1 | Yes |
| IBM Plex Sans Arabic (UI) | OFL-1.1 | Yes |

Hermes (the app's JS engine) has no `Intl.PluralRules`; the `intl-pluralrules` polyfill is loaded
in `src/i18n/index.ts` so Arabic plural forms work on the phone.

## Morning / evening split — how it is done

The source category 1 has 24 items. The evening wording is only given as bracket notes,
and some notes are cut short (e.g. `[وإذا أمسى قال: اللَّهم إني أمسيت...]`).

- **Morning category:** all items except evening-only ones (`إذا أمسى`). The evening bracket
  notes are removed from the text. Removing is safe: no word is added.
- **Evening category:** all items except morning-only ones (`إذا أصبح`). Since content v4 the
  evening words replace the morning words (from Dorar, or given by the owner), and the bracket
  notes are removed. See "Owner decisions on the sources" above.
- Both categories reuse the same audio files (the recordings read the morning wording).

## Count mismatches

Some `count` values do not match the count written in the text itself
(e.g. `حَسْبِيَ اللَّهُ ...` says `سَبْعَ مَرّاتٍ` but `count` is 1).
The build script detects these. The count written in the text wins, and every change is
logged in `docs/content-changes.md`.
