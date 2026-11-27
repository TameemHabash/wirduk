---
name: content-change
description: The ordered steps for any change to the app's content (content-source/, the content build, «أدومها»'s plan or texts, Dorar sources, recordings) - stop Metro, bump the content version, content:build, start Metro clean, check on the device. Use before editing content-source/ or anything the content build reads.
---

# Change the content

The app ships `assets/db/content.db`, built from `content-source/`. A phone keeps its copy
until the content version goes up, so **every** content change needs a new version. The order
matters.

## Rules first

- Never edit `content-source/adhkar.json` (the upstream copy). Every change to the book goes in
  `content-source/overrides.json`.
- Never retype Arabic content: cut it from its source with a script (`scripts/CLAUDE.md`).
- Never write a hadith source, grading or fadl: only Dorar pages saved by `scripts/dorar/`
  (`npm run dorar:apply`), or the owner's own words given in chat.

## Steps

1. **Stop Metro** (if it runs).
2. **Make the change** with its tool:
   - book text, counts, splits, line breaks, the owner's added adhkar, `audioRepeats`:
     `content-source/overrides.json`;
   - a Dorar source or fadl: `scripts/dorar/README.md`;
   - the owner's recordings: `node scripts/content/apply-audio-sheet.ts ../wirduk-audio/audio/ar`,
     then `node scripts/content/make-audio-manifest.ts ../wirduk-audio/audio/ar ar` (a push to
     `wirduk-audio` is public: ask first);
   - «أدومها»'s texts or plan: `node scripts/adwamuha/owner-texts.ts`,
     `node scripts/adwamuha/match-plan.ts --write` (`src/features/adwamuha/CLAUDE.md`).
3. **Bump** `APP_CONFIG.content.version` in `src/config/app-config.ts` (the build refuses
   changed content with an old version).
4. **Build:** `npm run content:build`. It writes `assets/db/content.db`,
   `content-source/content-lock.json`, `docs/content-changes.md` and `docs/sources-review.md`.
   Check the output with `npm run db:peek -- <dhikr ids>`.
5. **Start Metro clean:** `npx expo start --dev-client --port 8081 --clear` (Metro can keep the
   old `content.db` in its cache).
6. **Open the app** (`. .\scripts\dev\emulator.ps1; Open-App`). It installs `content-v{N}.db` and
   deletes the old one. Check:
   `& $adb shell run-as com.wirduk.app ls files/SQLite`.
7. Commit all the generated files with the change (`npm run verify` fails if one is out of
   date). Note the new version in `docs/status.md` ("Where things are now").

If the app reloaded between steps 3 and 4, it copied the old file under the new name; the
version check rejects it and the next start copies the right one (no crash since 2026-10-17).
