# Dorar tools (sources and fadl)

`content-source/dorar-sources.json` is the **source of truth** for every dhikr's source, grading,
link and fadl. The content build checks it and writes the `DhikrSources` table; the review page
`docs/sources-review.md` is generated from it. The rules are in `docs/decisions.md`
("Sources from Dorar", "Owner decisions on the sources").

**Never type a hadith, grading, source or fadl by hand.** Every field comes from a Dorar page
saved by these tools. A fadl is an exact quote cut out of the Dorar text, or the owner's own
words given in chat (stored with `by: "owner"`).

## Change one source (the usual job)

The owner gives a Dorar link (`https://dorar.net/h/…` or `https://dorar.net/hadith/sharh/…`)
for a dhikr id.

1. Start the receiver (keep it running in the background):
   ```powershell
   npm run dorar:receiver -- .local/dorar-pages
   ```
2. dorar.net blocks scripts (Cloudflare 403), so pages are read inside the owner's **Chrome**
   (ask the owner first; on 2026-10-17 they allowed it). Open any `https://dorar.net/` tab, run
   the code of `scripts/dorar/browser-helpers.js` in it (Claude in Chrome: `javascript_tool`),
   then:
   ```js
   await __dorar.save('/h/zq8ilghZ');
   ```
   It returns the book, number and grading, and the receiver writes
   `.local/dorar-pages/h_zq8ilghZ.json`.
3. Apply it:
   ```powershell
   npm run dorar:apply -- .local/dorar-pages/h_zq8ilghZ.json 27003
   npm run dorar:apply -- <page.json> 1006 --fadl "قالها أربعًا أعتقه الله من النار"   # exact quote, cut from the text
   npm run dorar:apply -- <page.json> 7002 --owner-fadl "<the owner's words>"
   npm run dorar:apply -- --none 45002 --note "Text unchanged."                    # no source
   npm run dorar:apply -- --fadl-only 1007 --no-fadl                                # remove a fadl, keep the source
   ```
   A dhikr id of the morning or the evening copy changes both (they share one entry).
4. Bump `APP_CONFIG.content.version` (`src/config/app-config.ts`), run `npm run content:build`,
   then `npm run verify`. Stop Metro before bumping, then restart it with `--clear`
   (see CLAUDE.md, "Content version").
5. Record the decision in `docs/decisions.md` if it is a new kind of rule.

## Evening words

Words that differ in the evening category only are text fixes of the split part 133 in
`content-source/overrides.json` (`categorySplits[0].parts[1].textFixes`, with the SOURCE dhikr
id: 133006 → dhikr 6 of source category 1). Words from Dorar are `wordingProposals` in
`dorar-sources.json` with `approved: true` (checked as exact quotes by the build).

## The first full run (2026-10-17, history)

All 287 adhkar were searched once (310 searches, one at a time with pauses, from a dorar.net tab)
and matched by wording (≥ 90% of the words in order, sahih or hasan, with extra rules for short
phrases, common formulas and caveats). The owner then answered every open item. Those tools
(`match.ts`, `finalize.mjs`, `curation.json`, the plan and the 34 MB of raw search results) are
kept as they were run in `research/dorar-first-run/` of the private archive
`TameemHabash/wirduk-archive` (not in this repo).
They are not needed for changes: `dorar-sources.json` already holds everything that ships. Do not
re-run `finalize.mjs`: it would overwrite later edits made with `apply-page.ts`.

Pages saved for a later change (`.local/dorar-pages/`) are not in git. Once applied, the
hadith is in `dorar-sources.json`; to keep the page too, keep it in `.local/` (not in git).
