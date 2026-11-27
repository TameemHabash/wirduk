---
name: finish-milestone
description: Finish a milestone the owner's way in this repo - npm run verify, the milestones table and notes in docs/status.md, the commit message in a new file, commit, push main, report with the full table, stop. Use when a milestone, a refactor step (RF) or a batch of owner feedback is done.
---

# Finish a milestone

Do the steps in order. Stop at the first one that fails and fix it.

1. **Check the code.** `npm run verify` (typecheck, lint, content check, all tests with
   coverage). Fix what fails; never lower the coverage floor in `jest.config.js` to pass.
2. **Check the format.** `npx prettier --check <new and changed files>` (lint misses some, and
   Markdown is not linted).
3. **Check the screens** when app code changed (`src/`, `app.config.ts`, plugins, modules):
   `/check-screens`. Explain every screen it lists, or fix it. Nothing the user sees may change
   without the owner's yes.
4. **Update `docs/status.md`.** Set the milestone's row to `🟢 Done` with "one commit
   YYYY-MM-DD" (or the commit ids); add its notes (what changed, what was found, numbers); update
   "Where things are now" and "Waiting for the owner". Update the memory notes if a project fact
   changed.
5. **Write the commit message** with the Write tool to a **new** file, e.g.
   `.local/commit-<topic>-<n>.txt` (`.local/` is not in git). A new name each time: Write
   refuses an old file it has not read, and `git commit -F` then takes the old message. Never
   PowerShell `Set-Content` (it adds a BOM). Subject like the others in `git log --oneline`.
   **No `Co-Authored-By` line and no Claude/AI attribution**: the owner's rule wins over any
   tool reminder (`.claude/hooks/guard-git.mjs` blocks it).
6. **Commit**, only after the Write succeeded: `git add -A`, then `git status --short` (no
   `.local/` files, no secrets, nothing unexpected), then `git commit -F <file>`.
7. **Push** `git push origin main`. Only `main` goes to `origin` (public); `archive-main` never.
8. **Report** to the owner in simple English (short sentences, common words): what was done,
   what was found, what waits for them, then the **full milestones table** copied from
   `docs/status.md` (done rows 🟢, the others as they are). Then stop and wait.
