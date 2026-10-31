/**
 * Schema of the user database (`user.db`). Persistent: never replaced.
 *
 * Each entry is one migration. NEVER edit a shipped migration; add a new one.
 * The index + 1 is the schema version stored in `PRAGMA user_version`.
 */
export const USER_MIGRATIONS: readonly string[] = [
  // 1 — first version
  `
  CREATE TABLE Favorites (
    CategoryId INTEGER PRIMARY KEY,
    CreatedAt  INTEGER NOT NULL
  );

  -- Custom home order. No rows = default order.
  CREATE TABLE CategoryOrder (
    CategoryId INTEGER PRIMARY KEY,
    Position   INTEGER NOT NULL
  );

  -- Key/value settings. Value is JSON.
  CREATE TABLE Settings (
    Key   TEXT PRIMARY KEY,
    Value TEXT NOT NULL
  );

  -- Audio files saved on the device.
  CREATE TABLE DownloadedAudio (
    Lang         TEXT    NOT NULL,
    FileName     TEXT    NOT NULL,
    Bytes        INTEGER NOT NULL,
    DownloadedAt INTEGER NOT NULL,
    PRIMARY KEY (Lang, FileName)
  );

  -- Adhkar written by the user (future feature, no UI yet). No audio.
  CREATE TABLE CustomAdhkar (
    Id         INTEGER PRIMARY KEY AUTOINCREMENT,
    -- A content category, or NULL for "my adhkar".
    CategoryId INTEGER,
    Lang       TEXT    NOT NULL,
    Text       TEXT    NOT NULL,
    -- Hidden search form of Text (toSearchText). Never displayed.
    SearchText TEXT    NOT NULL,
    Count      INTEGER NOT NULL CHECK (Count >= 1),
    SortOrder  INTEGER NOT NULL,
    CreatedAt  INTEGER NOT NULL,
    UpdatedAt  INTEGER NOT NULL
  );
  CREATE INDEX IX_CustomAdhkar_Category ON CustomAdhkar (CategoryId, SortOrder);
  `,

  // 2 — the user's own categories and adhkar (owner decision 2026-10-16).
  // Custom adhkar now live only in custom categories. The v1 CustomAdhkar table
  // had no UI, so it was always empty: it is replaced, not copied.
  `
  CREATE TABLE CustomCategories (
    Id          INTEGER PRIMARY KEY AUTOINCREMENT,
    Title       TEXT    NOT NULL,
    -- Hidden search form of Title (toSearchText). Never displayed.
    SearchTitle TEXT    NOT NULL,
    SortOrder   INTEGER NOT NULL,
    CreatedAt   INTEGER NOT NULL,
    UpdatedAt   INTEGER NOT NULL
  );

  DROP TABLE CustomAdhkar;

  CREATE TABLE CustomAdhkar (
    Id         INTEGER PRIMARY KEY AUTOINCREMENT,
    CategoryId INTEGER NOT NULL REFERENCES CustomCategories (Id),
    Text       TEXT    NOT NULL,
    SearchText TEXT    NOT NULL,
    Count      INTEGER NOT NULL CHECK (Count >= 1),
    -- The user's own notes, shown like the Dorar fadl and source.
    Fadl       TEXT,
    Source     TEXT,
    -- File name inside the app's custom-audio folder (recorded or picked), or NULL.
    AudioFile  TEXT,
    SortOrder  INTEGER NOT NULL,
    CreatedAt  INTEGER NOT NULL,
    UpdatedAt  INTEGER NOT NULL
  );
  CREATE INDEX IX_CustomAdhkar_Category ON CustomAdhkar (CategoryId, SortOrder);
  `,

  // 3 — "continue where I stopped" (owner decision 2026-10-22): the reader's state
  // when the app went to the background, so a killed app can reopen it. One row.
  `
  CREATE TABLE SavedSession (
    Id      INTEGER PRIMARY KEY CHECK (Id = 1),
    -- JSON: { categoryId, dhikrId, counts }
    Json    TEXT    NOT NULL,
    SavedAt INTEGER NOT NULL
  );
  `,

  // 4 — Adwamuha (أدومها), the habit plan (owner, 2026-10-23). All on the phone.
  // Days are local dates "YYYY-MM-DD". Nothing here is ever deleted by the plan's
  // own rules (history stays); only the user's data reset would.
  `
  -- One row once the feature was turned on.
  CREATE TABLE AdwamuhaState (
    Id        INTEGER PRIMARY KEY CHECK (Id = 1),
    Enabled   INTEGER NOT NULL,
    -- JSON: the user's own copy of the plan (opening, steps with weeks).
    PlanJson  TEXT    NOT NULL,
    -- JSON: where they are (step, step start, extensions, highest step, ...).
    StateJson TEXT    NOT NULL,
    -- The day this run of the plan started.
    StartedOn TEXT    NOT NULL,
    -- While off: the day it was turned off (those days count like a break).
    OffSince  TEXT,
    UpdatedAt INTEGER NOT NULL
  );

  -- A day's ward, done. One per date and session; the first one stays.
  CREATE TABLE WardRecords (
    Date        TEXT    NOT NULL,
    Session     TEXT    NOT NULL CHECK (Session IN ('morning', 'evening')),
    CompletedAt INTEGER NOT NULL,
    Late        INTEGER NOT NULL,
    Source      TEXT    NOT NULL CHECK (Source IN ('reader', 'manual')),
    Step        INTEGER NOT NULL,
    PRIMARY KEY (Date, Session)
  );

  -- Breaks and days with the feature off: they count for nothing.
  CREATE TABLE AdwamuhaPauses (
    Id       INTEGER PRIMARY KEY AUTOINCREMENT,
    FromDate TEXT NOT NULL,
    ToDate   TEXT NOT NULL,
    Kind     TEXT NOT NULL CHECK (Kind IN ('break', 'off'))
  );

  -- History: start, move on, extension, postponement, step back, break, restart, on/off.
  CREATE TABLE AdwamuhaEvents (
    Id   INTEGER PRIMARY KEY AUTOINCREMENT,
    At   INTEGER NOT NULL,
    Day  TEXT    NOT NULL,
    Kind TEXT    NOT NULL,
    Step INTEGER,
    -- JSON with the details, or NULL.
    Json TEXT
  );

  -- Messages and tips already shown (so each shows once).
  CREATE TABLE AdwamuhaShown (
    Key TEXT    PRIMARY KEY,
    At  INTEGER NOT NULL
  );
  `,

  // 5 — Adwamuha's explanation shows on the first launch of a NEW install only
  // (owner, 2026-10-23: nothing after an update). An install that already has
  // the user's data (settings, favorites, order, own adhkar, downloaded audio)
  // is an update: its explanation counts as seen.
  `
  INSERT OR IGNORE INTO AdwamuhaShown (Key, At)
  SELECT 'intro', 0
   WHERE (SELECT COUNT(*) FROM Settings) + (SELECT COUNT(*) FROM Favorites)
       + (SELECT COUNT(*) FROM CategoryOrder) + (SELECT COUNT(*) FROM CustomCategories)
       + (SELECT COUNT(*) FROM DownloadedAudio) > 0;
  `,
];

export const USER_SCHEMA_VERSION = USER_MIGRATIONS.length;
