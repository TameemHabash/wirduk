# Manual test checklist (before each release)

`npm run verify` covers the logic, the database and the screens. These checks
need a real phone or emulator, because they depend on native touch handling,
fonts and vibration. Each line was checked on the Android emulator when the
feature was built (date in brackets).

**2026-11-01, the owner, Galaxy S21+, release APK 68a8074: all fine.** Checked: the splash, «غير
مفعّلة», the 4 setup screens, «ترتيب الورد» and «بداية الأسبوع», «مساري»'s goal line, the new
recordings, «العدّ مع الصوت» on and off, the morning and evening download offline, TalkBack (the
counter, icon names, «مساري», the setup), the largest system font, audio with the screen off,
reminders (on time, app closed, after a restart, the tap), a report (with a picture, and offline),
rotation, «المتابعة من حيث توقفت», «إتمام». The owner's full check covers the whole list, also the
lines below without a date (owner, 2026-11-01).

## Home
- [ ] Morning or evening card shows "الآن" by time of day (morning 03:00–14:59). [2026-10-16]
- [ ] Only the logo shows at the top (no name beside it). [2026-10-17]
- [ ] Tapping a star fills it gold and adds a chip under "المفضلة"; it is still there after restarting the app. [2026-10-16]
- [ ] "تعديل الترتيب" → drag a row by its handle → "تم": the new order is kept after restarting. [2026-10-16]
- [ ] Scrolling the list in reorder mode never moves a row (only the handle drags). [2026-10-16]
- [ ] "استعادة الترتيب الافتراضي" asks first, then restores the book order. [2026-10-16]
- [ ] The heading "كل الأذكار" is never cut, also after opening and closing reorder mode. [2026-10-16]
- [ ] With 3-button navigation, the end of the Home list and of search results stays above the bar. [2026-10-17, Galaxy S21+, Home]

## Reader
- [ ] A short tap anywhere on the dhikr or the counter counts +1, with a light vibration. [2026-10-16]
- [ ] Scrolling a long dhikr up and down never counts. [2026-10-16]
- [ ] Reaching the count moves to the next dhikr by itself after a short pause. [2026-10-16]
- [ ] Swiping left-to-right (Arabic) goes to the NEXT dhikr; right-to-left goes back. [2026-10-16]
- [ ] The reset button (top corner) resets only the current dhikr. [2026-10-16]
- [ ] Counter numbers of two and three digits show fully (10, 100). [2026-10-16]
- [ ] Finishing every dhikr opens "بارك الله فيك وتقبّل عملك", with one long vibration (600 ms). [2026-10-17, checked in Android's vibration log]
- [ ] With "اهتزاز طويل عند إتمام الباب" off, finishing gives no long vibration.
- [ ] With "صوت خفيف عند كل عدّة" on, every count plays a short tick, also on fast taps, clearly audible at a normal media volume. Off by default. [2026-10-17, checked in Android's audio log; louder since 2026-10-22]
- [ ] Leaving the reader (back, or "العودة إلى الرئيسية" after finishing) and opening the category again starts every dhikr from 0.
- [ ] "إتمام" fills the count of the current dhikr and moves to the next one; on the last open dhikr it opens the completion screen. Disabled on a complete dhikr.
- [ ] Counts are kept while the reader stays open (e.g. after opening the Dorar link and coming back).
- [ ] Moving on to the next dhikr gives a medium vibration (setting "اهتزاز عند الانتقال إلى الذكر التالي"); off: none.
- [ ] Tapping "عرض في الدرر السنية" counts, and shows "للعرض في الدرر السنية اضغط هنا" at the bottom for a few seconds; pressing it opens Dorar; tapping elsewhere keeps counting.
- [ ] The screen stays on in the reader ("إبقاء الشاشة مضاءة"); off: it sleeps as usual.
- [ ] Rotating the phone (auto-rotate on): the reader shows text and counter side by side and keeps the counts and the page; Home, Settings and the completion screen scroll.
- [ ] Rotating to landscape and back to portrait, twice: the dhikr stays centered (not shifted to a side, no part of the next page showing), and swiping still works. [2026-10-23, emulator]
- [ ] "المتابعة من حيث توقفت": in the reader, go Home (phone button), close the app from recent apps, open it: the same dhikr with the same counts, and the toast. After 5 hours, or with the setting off: a fresh app. The same after playing the audio (the process stays alive), also in a «أدومها» ward and after a start from a reminder (fixed 2026-11-01). [2026-11-01, emulator and the owner's two Samsung phones]
- [ ] Morning and evening start with "الْحَمْدُ للهِ وَحْدَهُ، وَالصَّلَاةُ وَالسَّلامُ عَلَى مَنْ لاَ نَبِيَّ بَعْدَهُ" (with the owner's recording since 2026-10-31); no (( )) in any dhikr.
- [ ] Each surah of المعوذات (1002, 2001, 27005) starts its own line; in 1001 آية الكرسي starts on the line after الاستعاذة; the steps of 31001 are one per line.
- [ ] A dhikr with a Dorar source shows "المصدر: …", "الحكم: …" and "عرض في الدرر السنية" in small faded text. [2026-10-17, 1005]
- [ ] Tapping "عرض في الدرر السنية" opens the browser and does **not** count. [2026-10-17]
- [ ] Updating the app with a new content version keeps favorites, settings and own adhkar, installs the new content and removes the old file. [2026-10-17, release build over content v2]
- [ ] A broken or wrong installed content copy (e.g. `content-v4.db` holding version 3) is copied again at start, with no crash. [2026-10-17, emulator: crashed before the fix, fine after]
- [ ] The evening category shows the evening words (e.g. "اللَّهُمَّ إني أمسيت أشهدك", 133015 with "خير هذه الليلة") and no "[وإذا أمسى …]" notes; the morning category is unchanged. [2026-10-17, 133006, 133015]
- [ ] A fadl written by the owner shows like a Dorar quote (e.g. 7002). [2026-10-17]

## Audio
- [ ] First play of a dhikr: spinner, then it plays; the file is in `files/audio/ar/` with its full size, no `.part` file. [2026-10-17, local copy of the audio site]
- [ ] Pause and play again from the same button. [2026-10-17]
- [ ] With the screen off, the recording keeps playing (background playback on). [2026-10-17]
- [ ] The lock screen / notification shows the category title and "وِرْدُك" with play/pause. [2026-10-17, media session checked]
- [ ] With "العدّ مع الصوت" off: a dhikr with a count above 1 replays its recording that many times ("التكرار 3 من 100" under the position), also with the screen off, without changing the counter; after the last play the reader waits on the dhikr. When the user finishes the count, it moves on and the next recording plays (autoplay on). [2026-10-31, emulator]
- [ ] With "العدّ مع الصوت" on (the default since 2026-10-31): each play adds 1 to the counter (5 for a recording that says it 5 times); at the count the reader moves to the next dhikr and plays it. After tapping a few times by hand, the recording plays only the times left. [2026-10-17, 1013: 0 → 1 → 2 → moved to 14, playing]
- [ ] With the screen off (and "العدّ مع الصوت" on or off), the reader goes on to the next dhikr and plays it without unlocking the phone.
- [ ] With autoplay off, it stops at the end.
- [ ] With background playback off, audio pauses when leaving the app.
- [ ] No internet (airplane mode): "لا يوجد اتصال بالإنترنت…"; a downloaded dhikr still plays. [2026-10-17, message]
- [ ] Settings → "تحميل صوتيات الصباح والمساء" shows the size left (about 12 MB); progress, "إيقاف التحميل", then "تحميل الباقي" continues; ends with 30 of 30 ("download every recording" is hidden since 2026-10-30). [2026-11-01, owner's phone]
- [ ] "حذف الصوتيات المحمّلة" asks first, then shows 0; own recordings in "أذكاري" still play. [2026-10-17, delete]
- [ ] The live site serves every file with the right size (GitHub Pages sends `audio/mp3`), and the first play downloads from it. [2026-10-17: all 397 checked by size; first play from Pages on the emulator]

## My adhkar ("أذكاري")
- [ ] Home shows "أذكاري" below the favorites, in sand color; empty, it shows "أضف أذكارك الخاصة". [2026-10-17]
- [ ] Create a category → add a dhikr with count, fadl note and audio → it shows on Home and opens in the reader with a sand border and the "أذكاري" label. [2026-10-17]
- [ ] Pick an audio file from the phone (system picker → Downloads): play works; saving keeps a copy in the app. [2026-10-17]
- [ ] "تسجيل بصوتي": the microphone permission is asked once; recording shows a timer; stop → play works. [2026-10-17]
- [ ] Replacing or removing the audio deletes the old file (no leftovers in `files/custom-audio`). [2026-10-17]
- [ ] Leaving the dhikr editor with unsaved changes asks first.
- [ ] The count box in the dhikr editor shows its digits fully, centered (no cut at the top).
- [ ] Sorting own categories and own adhkar by dragging the handle; the order is kept after restarting.
- [ ] Deleting a category asks first, then removes it from Home, favorites and search.
- [ ] Arabic text with tashkeel typed by the user shows fully in every dhikr font.

## Reading and fonts
- [ ] Every dhikr font, at sizes 16, 24 and 40: no tashkeel touches or is cut on the line above or below. [2026-10-16: all four fonts at 40 and 24, Ayat al-Kursi]
- [ ] The longest dhikr (أذكار الاستيقاظ من النوم, no. 4) at size 40 scrolls to its end; the last line is fully visible. [2026-10-16, size 24]
- [ ] Settings: "أ+" / "أ−" change the preview at once; "أ+" is disabled at 40, "أ−" at 16.

## Theme
- [ ] Light, dark and system all apply at once and are kept after restarting. [2026-10-16]
- [ ] In dark mode the status bar icons are light. [2026-10-16]
- [ ] The logo on Home and About is the light one in light mode and the dark one in dark mode. [2026-10-17]

## Icon and splash (release build too: dev builds may not show every splash setting)
- [ ] The app icon is the round logo, not cut at the edges, on the home screen and in the app list. [2026-10-17, dev build]
- [ ] With "Themed icons" on (Android 13+), the icon shows in one color with its details.
- [ ] The splash shows the whole logo, centered, on the light background (dark logo on dark background in dark mode). [2026-10-17, light, dev build]

## Accessibility (TalkBack)
- [ ] The counter reads "تم N من M"; double-tap counts.
- [ ] Every icon button has a spoken name.

## Reminders (milestone 9)
- [ ] Both reminders are off on a new install; turning one on asks for the notification permission once (Android 13+).
- [ ] Refusing the permission keeps the switch off and shows the toast; the toast opens the app's page in the phone settings.
- [ ] Tapping the time opens the clock (12 hours); the new time shows as "6:30 ص" and the reminder moves to it.
- [ ] The reminder arrives at about the chosen time (a few minutes late is normal), also with the app closed and after a phone restart.
- [ ] Tapping the reminder opens the morning / evening adhkar, both with the app closed and with it open; "continue where I stopped" does not open something else.
- [ ] Turning a reminder off: it no longer arrives.

## Report an issue (milestone 9, after the relay is deployed)
- [ ] Settings → الدعم shows "الإبلاغ عن مشكلة" (only in a build with `APP_CONFIG.report.endpoint`).
- [ ] "إرسال" stays disabled until the description has 10 characters.
- [ ] Adding screenshots from the gallery: thumbnails show; × removes one; at most 4.
- [ ] The details list matches the phone; turning the switch off leaves them out of the issue. [2026-10-23, emulator: screen, phone text size and free storage too]
- [ ] A sent report arrives as an issue in the private repo, with readable screenshots.
- [ ] With no network: the "تأكد من الاتصال بالإنترنت" message, and the text is kept.
