# scripts — content, sources, texts, dev helpers

Node 24 runs these `.ts` files directly (type stripping). They import app files by relative path
with the `.ts` extension, so those app files have no `@/` imports. Checked by
`tsc -p scripts` (in `npm run typecheck`); their tests run in the jest "logic" project.

## Arabic text (always)

- **Never retype Arabic content** (adhkar, hadith, verses, the owner's words) into a data file:
  cut it from its source with a script (the book, a saved Dorar page, `.local/tanzil/`, the
  owner's chat text saved in `.local/`). Marks can be stored in a different order and still look
  the same.
- Matching Arabic words in code: ignore the marks (`loose()` in `content/lib/line-breaks.ts`); the
  book stores shadda and fatha in either order, so a typed pattern can miss.
- Keep Arabic out of `.ps1` files (PowerShell 5.1 reads them as ANSI). They set their own PATH.

## Content (`content/`)

- `npm run content:build` (`build-content-db.ts`) builds `assets/db/content.db` from
  `content-source/` and writes the lock file, `docs/content-changes.md` and
  `docs/sources-review.md`. `npm run content:check` (in `verify`) fails when any is out of date.
- Never edit `content-source/adhkar.json` (the upstream copy). Every change to the book goes in
  `content-source/overrides.json`: splits, counts, typos, evening words, the owner's added adhkar
  (positions 900+, e.g. 1901 first in the morning), removing the (( )) marks
  (`lib/quote-marks.ts`), line breaks (`lib/line-breaks.ts`), and `audioRepeats` (times a
  recording says its dhikr, by file name; it must divide every count using that file).
- Any content change needs a new content version, in order: the `/content-change` skill.
- The owner's recordings (`docs/audio/morning-evening-audio.csv`):
  `node scripts/content/apply-audio-sheet.ts ../wirduk-audio/audio/ar` (checks, copies, writes
  `audioRecordings`), then `node scripts/content/make-audio-manifest.ts ../wirduk-audio/audio/ar ar`,
  the content version, `content:build`. A push to `wirduk-audio` is public: ask first.

## Dorar (`dorar/`)

- A source, takhreej, grading or fadl comes only from a Dorar page saved by these tools, or from
  the owner's own words given in chat. Never write or guess one. Steps: `dorar/README.md`
  (`npm run dorar:receiver`, `npm run dorar:apply`).
- dorar.net blocks scripts (Cloudflare 403): read pages only in the owner's Chrome tab (allowed
  for dorar.net; open Chrome when it is not running).
- Never read `content-source/dorar-sources.json` (550 KB) or `docs/sources-review.md` in full:
  use Grep, `npm run db:peek -- <ids>`, or a small script.

## «أدومها» (`adwamuha/`)

`match-plan.ts --write` (the default plan), `owner-texts.ts` (the owner's texts),
`design-strings.ts` (the design's strings into `common.json`), `messages.ts` (the message
library). What each feeds and the rules: `src/features/adwamuha/CLAUDE.md`.

## Dev helpers (`dev/`)

- `peek-db.ts` (`npm run db:peek`), `emulator.ps1` (`Open-App`, `Open-Link`; dot-source it).
- The Maestro runs: `e2e.ps1`, `e2e-timeline.ps1`, `compare-shots.ts`, `e2e-strings.ts`,
  `tap-trace.ts` (`e2e/CLAUDE.md`).
- `phone-apk.ps1`: the phone APK, only when the owner asks (`/phone-apk`).
- `git-guard.ts`: the checks behind the Claude Code hook `.claude/hooks/guard-git.mjs` (no AI
  attribution in commits, only `main` to `origin`).

## Branding (`branding/`)

`npm run branding:build` turns `wirduk-logo/*.svg` into the icon, splash and in-app logo images.
Then `npx expo prebuild --platform android` before the next build: the APK takes the copies in
`android/`.
