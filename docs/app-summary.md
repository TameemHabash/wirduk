# وِرْدُك (Wirduk) — app summary

An Android app for daily adhkar (morning, evening and the other adhkar of the book "Hisn al-Muslim"),
in Arabic, right to left. It works offline. **No ads, no analytics, no tracking, no accounts.**
Status (October 2026): tested by the owner and a few friends; Google Play comes later.

- Privacy policy: https://tameemhabash.github.io/wirduk-audio/privacy/
- About (inside the app): the adhkar come from "حصن المسلم" by Sa'id ibn Ali ibn Wahf al-Qahtani
  (through the open Adhkar-json project); the hadith sources and their virtues (fadl) come from
  Dorar (dorar.net); the recordings are by Hamad al-Duraihim; the fonts are open (SIL OFL 1.1).

## What the app does today

- **Home:** morning and evening cards (the right one first, by time of day), favorites, all 133
  categories (the user can reorder them), and the user's own categories ("أذكاري").
- **Reader:** one dhikr per page. Tap anywhere to count; at the count it moves to the next dhikr.
  An "إتمام" button, a completion screen, light vibration per count, a longer one per dhikr and
  per category, an optional tick sound. Keeps the screen on, works in landscape. "Continue where
  I stopped": after the app was closed, it reopens the same dhikr with the same counts (up to 5 h).
- **Text:** 4 Arabic dhikr fonts, size 16–40, light / dark / system theme. Each dhikr can show its
  source on Dorar (with a link) and its virtue.
- **Audio:** a recording for most adhkar. Downloaded the first time it is played (or all at once),
  then offline. Plays in the background and on the lock screen, can play the next dhikr on its
  own, repeats as many times as the count; optional "count with the audio".
- **Own adhkar:** the user makes categories and adhkar (text, count) and can add a voice recording
  or an audio file.
- **Search** in all adhkar.
- **Reminders:** a morning and an evening notification, each with its own time; off by default;
  made on the phone (no server). A tap opens those adhkar. Android may deliver them a little late.
- **Report an issue:** a description, up to 4 screenshots and the app/device details, all shown
  before sending. It becomes an issue in a private GitHub repo, through a small relay; the user
  needs no account.

Content: 133 categories, 289 adhkar; 270 have a Dorar source, 11 have a virtue.

## Rules every new feature must keep

1. No ads, analytics, tracking or accounts. The app works offline; internet only for audio
   downloads and reports the user chooses to send.
2. **Never invent a hadith source, takhreej, grading or virtue.** Only from Dorar, or the owner's
   own words.
3. The adhkar text is never retyped by hand; text changes go through the content build, so every
   change is logged.
4. Arabic interface, right to left. Android first (iOS maybe later).
5. If a feature sends anything off the phone, the privacy policy must say so first.
6. Free hosting only: GitHub Pages (audio, privacy page), a Cloudflare Worker (free plan) for
   reports.

## Technology (short)

React Native 0.86 with Expo SDK 57 (Expo Router, TypeScript). The adhkar ship inside the app as a
read-only SQLite database; the user's data (favorites, settings, own adhkar) is a second SQLite
database on the phone. expo-audio, expo-notifications. About 400 automated tests.
Repos: `wirduk` (the code; private now, to become public under MIT), `wirduk-audio` (public:
recordings and the privacy page), `wirduk-reports` (private: user reports).

## Plans and decisions so far

- Next: quality and edge cases (no network, full storage, very large fonts, permissions), then
  Google Play.
- Waiting: new recordings from the owner (for example the opening dhikr).
- Decided: reminders may come up to an hour late (no exact-alarm permission); reports go to a
  separate private repo; the code becomes open source once everything else is done.

## When you suggest a feature

Say what it does for the user, what it needs (permissions, internet, new data, new screens), and
how it keeps the rules above. Keep it simple: one person builds this app.
