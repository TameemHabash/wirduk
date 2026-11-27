# src/data — the databases

Two SQLite databases, opened at start by `db/open-databases.ts` (`DataProvider`):

- `content-v{N}.db`: a read-only copy of `assets/db/content.db`, one file per content version
  (a damaged or old copy is found by `PRAGMA quick_check` + the version, and copied again).
- `user.db`: the user's data. Never replaced; changed only by migrations.

Repositories (`repositories/`, one class per file) are the only code that runs SQL. They use
the small `SqlDatabase` interface (`db/sql.ts`): the app gives expo-sqlite, tests give Node's
SQLite, so tests run the real SQL and FTS5, also on the shipped `content.db`. Screens get them
with `useRepositories()`. `data/` never imports a feature (lint): shared «أدومها» types and
defaults live in `models/adwamuha.ts`.

## Rules

- Migrations: `db/user-schema.ts`. **Add** a new entry at the end; never edit or remove a shipped
  one (phones already ran it). `migrate()` refuses a database newer than the app. Schema 8 now.
- Never reset the user's data. Android's automatic backup puts an old `user.db` back on a new
  install (RF2, `docs/decisions.md`), so the code that reads old stored data (`extraWeeks`, old
  event kinds) stays.
- Any change to the content needs a new content version, in order: the `/content-change` skill.
- `models/adwamuha.ts` is also imported by Node scripts: relative imports only, never `@/`
  (`docs/architecture.md`).
- A new table: decide if it goes in the backup file. Phone-only tables are listed in
  `DEVICE_TABLES` (`backup/backup-db.ts`: `DownloadedAudio`, `SavedSession`, `WardProgress`).

## Traps

- **expo-sqlite transactions run on a new connection** (`withExclusiveTransactionAsync`, our
  `SqlDatabase.transaction()`): an `ATTACH` (or a temp table) made on the main connection is not
  visible inside. The restore uses `BEGIN IMMEDIATE … COMMIT` on the main connection instead.
- `VACUUM INTO` and `ATTACH` need a plain file path, not a `file://` URI: `sqlitePath(name)`.
- The content database is opened with `finalizeUnusedStatementsBeforeClosing: false`. With the
  default, closing it after `PRAGMA quick_check` freed FTS5's statements twice (native crash).
  Keep it.
- If the app reloads after the version bump but before `npm run content:build`, it copies the old
  file under the new name; the version check rejects it and the next start copies the right one.
  Check on the device with `run-as com.wirduk.app ls files/SQLite`.

## Backup

- The backup file is a SQLite database (`backup/backup-db.ts`: save with `VACUUM INTO`, check,
  restore with the usual migrations, a safety copy first). After a restore the app starts again
  (`useRestartApp()` in `DataProvider`). Files and the share sheet: `features/backup/`.
- Android's automatic backup: `modules/wirduk-backup` (a local Expo module: a backup agent that
  records the date, and the backup rules) and `plugins/with-backup-agent.js` (the manifest).
  Changing either is a native change: `npx expo prebuild`, then `npm run android`. README
  "Backup" has the `bmgr` commands to test it on the emulator.
