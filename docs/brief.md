# Original brief — "وِرْدُك" (Wirdak)

This is the owner's original brief, kept as-is for reference.
Later decisions are in [decisions.md](decisions.md) and win over this file.

---

## 1. Overview
- **Name:** وِرْدُك (Arabic) / **Wirdak** (English).
- **What it is:** An adhkar app inspired by the "Hisn al-Muslim" (حصن المسلم) app's *functionality*, with a fresh **simple, modern UI/UX**. Do NOT copy the existing app's name, icon, design, assets, fonts or code.
- **Package id:** ask me; suggest `com.<my-github-username>.wirdak`.
- **No ads, no analytics, no tracking, no user accounts.** Fully offline except audio downloads.

## 2. Tech stack
- **React Native + Expo (development build, not Expo Go)**, TypeScript.
- **Android is the primary target.** iOS code must also be written correctly and build-ready, but I can't test iOS now — keep platform-specific code clean and mark anything untested.
- Suggested libs (verify current versions/APIs before using): `expo-sqlite`, `expo-file-system`, `expo-audio`, `expo-notifications`, `expo-haptics`, `react-native-draggable-flatlist`, `i18next` + `react-i18next`, `react-native-reanimated`, `react-native-gesture-handler`.
- Clean architecture: data layer (repositories) separate from UI; strongly typed models; config file for constants (audio base URL, content version, etc.).

## 3. Content source
- Use **`rn0x/Adhkar-json`** (https://github.com/rn0x/Adhkar-json). The repo states the files have no license and can be used freely. It is archived — clone it once and keep our own copy.
- Structure: categories with `id`, `category`, `audio`, `filename`, `array[]`; each dhikr has `id`, `text`, `count`, `audio`, `filename`.
- Text is **stored and displayed with full tashkeel**, exactly as in the source.

## 4. Data storage (SQLite)
- Convert the JSON into a **prebuilt SQLite database** with a build-time script (don't parse JSON at runtime). Ship the DB with the app.
- **Separate content tables (static, replaceable) from user tables (persistent).** A content update must never wipe user data.
- **Multi-language-ready schema** even though only Arabic is used now, e.g.:
  - `Categories(Id, SortOrder, AudioFile)` + `CategoryTranslations(CategoryId, Lang, Title)`
  - `Adhkar(Id, CategoryId, SortOrder, Count, AudioFile)` + `DhikrTranslations(DhikrId, Lang, Text, SearchText)`
  - `DhikrSources(DhikrId, Lang, Fadl, Source, Grading, DorarUrl)`
- `SearchText` = text with tashkeel removed + normalized (أ/إ/آ→ا, ة/ه, ى/ي, etc.) for search. Use **FTS5** for search. Never display `SearchText`.
- **Content version number**: on app update, if the shipped content version is newer, replace content tables only.
- User tables: favorites, category custom order, settings, downloaded-audio registry, custom adhkar.
- **Custom adhkar (future feature):** create the model, table and repository now (text, count, category, no audio; auto-generate `SearchText`), stored in user tables. **No UI for it yet.**

## 5. Fadl & source (فضل الذكر والمصدر)
- Each dhikr should show its fadl (if any) and its source/takhreej, like Hisn al-Muslim does.
- The JSON does NOT contain these. Get them **only from الدرر السنية — https://dorar.net/** (use their search/API where available). Store the result in `DhikrSources` with the Dorar link and the grading (حكم المحدث) when available.
- **Never write, guess or generate a source, takhreej or fadl from your own knowledge.** If a dhikr can't be matched confidently on Dorar, leave it empty and add it to a review report (`docs/sources-review.md`) listing the dhikr id, text and what you found, so I can review manually.
- Display: under the dhikr, **small font and a muted/faded color**, so it's available for whoever wants it without distracting everyone else.

## 6. Dhikr screen & counter
- **Tapping anywhere on the screen increments the counter** (not only the counter button).
- **Long adhkar must scroll.** A scroll/drag gesture must NOT count as a tap — only a short tap counts.
- A **small reset button in the top corner** resets the counter of the **current dhikr only**.
- When the dhikr reaches its count → **auto-advance to the next dhikr** (like Hisn al-Muslim), with a smooth transition.
- **Light haptic feedback** on each count — toggleable in settings (on by default).
- When the whole category is completed → a nicely designed completion screen: **"بارك الله فيك وتقبّل عملك"**.
- Counters are kept in memory only — **they reset when the app is closed**.

## 7. Audio
- **398 mp3 files, ~184 MB total**, largest ~5.1 MB, 128kbps. **Keep them as-is (no re-encoding).**
- Hosting: a separate **public** GitHub repo **`Wirdak-audio`** with files at `audio/{lang}/{filename}.mp3` (move the source `audio/*` into `audio/ar/`), served by **GitHub Pages**:
  `https://<username>.github.io/Wirdak-audio/audio/{lang}/{filename}.mp3`
- The base URL lives in the config file so the host can be changed later without code changes.
- **On-demand download:** the first time a dhikr's audio is played, download that single file, store it locally, and from then on always play from local storage. Show a small loading indicator on the play button; show a clear message if offline.
- **Settings → "تحميل كل الصوتيات":** downloads all audio for the **current app language only**; skips already-downloaded files; progress bar; cancel; resumes after interruption; shows total size before starting.
- **Settings → delete downloaded audio.**
- **Background playback** (keeps playing with screen off) — toggleable, on by default.
- **Sequential autoplay** of the category's adhkar one after another — toggleable, on by default.

## 8. Home & categories
- Category list on the home screen.
- **Reorder categories by drag & drop**, via an "تعديل الترتيب" edit mode (to avoid accidental drags while scrolling). Persist the order in user tables. Include "استعادة الترتيب الافتراضي".
- **Favorites:** a place where the user adds favorite **categories**.
- **Search** across adhkar (FTS, tashkeel-insensitive).

## 9. Reading & fonts
- Font size control (increase/decrease) in settings, with live preview.
- **Dhikr text font:** default **KFGQPC Uthmanic Hafs**; selectable alternatives in settings, all **Arabic fonts suited to religious text with full tashkeel support**, openly licensed (e.g. Amiri, Scheherazade New, Noto Naskh Arabic). Verify each font's license before bundling.
- **UI font:** a separate clean modern Arabic font (e.g. IBM Plex Sans Arabic or Noto Sans Arabic).
- Make sure tashkeel never overlaps or gets clipped with any font at any size (line height!).

## 10. Localization
- **Arabic only for now** — no language picker in the UI.
- But fully ready for more languages: all UI strings in i18next resource files (no hard-coded strings), content read by current language, and **layout direction (RTL/LTR) derived from the language**, not hard-coded.

## 11. Theme & design
- **Light / Dark / System** theme, selectable in settings.
- **Simple, modern UI/UX.** Research current well-designed adhkar/Islamic apps for inspiration, then propose a design direction (colors, typography, spacing) before implementing.
- **Logo:** I will give you an image — generate the app icon (all sizes, Android adaptive icon) and the splash screen from it.

## 12. Notifications (optional)
- Morning and evening adhkar reminders at times the user picks. **Off by default**; each can be enabled separately.

## 13. Other screens
- **About (عن التطبيق):** app information only.
- **Privacy policy:** a simple page hosted on the same GitHub Pages site (the app collects no data). Google Play requires its URL.

## 14. GitHub setup
- Use the **GitHub CLI (`gh`)** on my machine. First run `gh auth status`; if not logged in, ask me to run `gh auth login`. Read my username from `gh api user`.
- Two repos (ask me before creating):
  - **`wirdak`** — app source code (private) — already created
  - **`wirdak-audio`** — public; audio + privacy policy; enable GitHub Pages and verify a file URL works.

## 15. Google Play (LAST step, only after I finish testing)
- Prepare EAS Build / EAS Submit (or fastlane) config for Android release (AAB), signing, versioning.
- Remind me of what must be done manually: Play developer account, the first upload via Play Console, store listing, privacy policy URL, and any closed-testing requirement for new personal accounts (check the current rules).
- **Before publishing, remind me to confirm the rights to the audio recordings** (reciter: حمد الدريهم) — the JSON repo's "free use" note may not cover the recordings.

## 16. Quality
- Write unit tests for the data layer (normalization, search, counters, download manager).
- Handle edge cases: no network, partial downloads, storage full, very long adhkar, largest font size.
- Keep a `README.md` with setup, build and data-generation steps.
