/**
 * Schema of the shipped content database (`assets/db/content.db`).
 *
 * Content is static and replaceable: the app swaps the whole file when
 * `APP_CONFIG.content.version` goes up. User data lives in another database
 * (see `user-schema.ts`), so a content update can never touch it.
 *
 * Multi-language ready: every text lives in a `*Translations` table keyed by
 * `Lang`. Only Arabic exists today.
 *
 * No imports: the content build script runs this file directly in Node.
 */

export const CONTENT_META_KEYS = {
  version: 'content_version',
  sourceCommit: 'source_commit',
} as const;

export const CONTENT_SCHEMA_SQL = `
CREATE TABLE Meta (
  Key   TEXT PRIMARY KEY,
  Value TEXT NOT NULL
);

CREATE TABLE Categories (
  Id        INTEGER PRIMARY KEY,
  SortOrder INTEGER NOT NULL UNIQUE,
  -- Whole-category recording from the source. Hosted, but not used by the app.
  AudioFile TEXT
);

CREATE TABLE CategoryTranslations (
  CategoryId  INTEGER NOT NULL REFERENCES Categories(Id),
  Lang        TEXT    NOT NULL,
  Title       TEXT    NOT NULL,
  -- Hidden search form of Title (see toSearchText). Never displayed.
  SearchTitle TEXT    NOT NULL,
  PRIMARY KEY (CategoryId, Lang)
);

CREATE TABLE Adhkar (
  Id         INTEGER PRIMARY KEY,
  CategoryId INTEGER NOT NULL REFERENCES Categories(Id),
  SortOrder  INTEGER NOT NULL,
  Count      INTEGER NOT NULL CHECK (Count >= 1),
  -- File name without extension. URL: <audio base>/<lang>/<AudioFile>.mp3
  AudioFile  TEXT,
  UNIQUE (CategoryId, SortOrder)
);

CREATE TABLE DhikrTranslations (
  DhikrId    INTEGER NOT NULL REFERENCES Adhkar(Id),
  Lang       TEXT    NOT NULL,
  -- Displayed text, with full tashkeel exactly as in the source.
  Text       TEXT    NOT NULL,
  -- Hidden search form of Text. Never displayed.
  SearchText TEXT    NOT NULL,
  PRIMARY KEY (DhikrId, Lang)
);

-- Fadl and takhreej, taken only from dorar.net. Empty until matched and reviewed.
CREATE TABLE DhikrSources (
  DhikrId  INTEGER NOT NULL REFERENCES Adhkar(Id),
  Lang     TEXT    NOT NULL,
  Fadl     TEXT,
  Source   TEXT,
  Grading  TEXT,
  DorarUrl TEXT,
  PRIMARY KEY (DhikrId, Lang)
);

-- Size of every hosted audio file, so "download all" can show the total
-- before it starts, and partial downloads can be detected.
CREATE TABLE AudioFiles (
  Lang     TEXT    NOT NULL,
  FileName TEXT    NOT NULL,
  Bytes    INTEGER NOT NULL CHECK (Bytes > 0),
  -- Times the dhikr is said in one play of the recording (content v9+).
  -- The reader plays it Count / Repeats times; the build checks it divides evenly.
  Repeats  INTEGER NOT NULL DEFAULT 1 CHECK (Repeats >= 1),
  PRIMARY KEY (Lang, FileName)
);

-- Adwamuha (أدومها): the DEFAULT habit plan (content v10+). When the user turns
-- the feature on, the app copies it into user.db and uses only that copy.
CREATE TABLE PlanStages (
  Stage INTEGER PRIMARY KEY,
  -- Minimum weeks per step in this stage.
  Weeks INTEGER NOT NULL CHECK (Weeks BETWEEN 1 AND 8)
);

CREATE TABLE PlanStageTranslations (
  Stage INTEGER NOT NULL REFERENCES PlanStages(Stage),
  Lang  TEXT    NOT NULL,
  Title TEXT    NOT NULL,
  PRIMARY KEY (Stage, Lang)
);

-- Each step adds one dhikr to the morning ward, the evening ward, or both.
-- Step 0 is the opening: first in every ward, not a step of its own.
CREATE TABLE PlanSteps (
  Step           INTEGER PRIMARY KEY,
  Stage          INTEGER REFERENCES PlanStages(Stage),
  MorningDhikrId INTEGER REFERENCES Adhkar(Id),
  EveningDhikrId INTEGER REFERENCES Adhkar(Id),
  CHECK (MorningDhikrId IS NOT NULL OR EveningDhikrId IS NOT NULL)
);

-- Adwamuha's message library (content v11+): only what the owner approved.
-- Written from content-source/adwamuha-messages.json; nothing typed by hand.
CREATE TABLE AdwamuhaMessages (
  Lang      TEXT NOT NULL,
  Id        TEXT NOT NULL,
  Kind      TEXT NOT NULL CHECK (Kind IN ('verse', 'hadith', 'athar')),
  -- The moments it may be shown at, space-separated (e.g. 'wardDone bothDone').
  Moments   TEXT NOT NULL,
  -- Verses: one verse per line, verbatim from the Tanzil text. Hadiths: Dorar's text.
  Text      TEXT NOT NULL,
  -- Verses only: the surah (number, Tanzil's name) and the first and last verse.
  Sura      INTEGER,
  SuraName  TEXT,
  FromAya   INTEGER,
  ToAya     INTEGER,
  -- Hadiths and athar only: Dorar's fields.
  Rawi      TEXT,
  Muhaddith TEXT,
  Book      TEXT,
  Number    TEXT,
  Grading   TEXT,
  DorarUrl  TEXT,
  PRIMARY KEY (Lang, Id)
);

-- Adwamuha's own messages and tips (content v12+), each shown in one state: the owner's
-- (from the description), the owner's design, or Claude's drafts joined with the design's
-- words. Written from content-source/adwamuha-texts.json (cut by script, nothing typed).
CREATE TABLE AdwamuhaTexts (
  Lang      TEXT NOT NULL,
  Id        TEXT NOT NULL,
  -- A message moment (e.g. 'wardDone'), 'welcome' or 'tip'.
  Moment    TEXT NOT NULL,
  -- '' for a message; 'stage:N' or 'maintenance' for a tip; '<first|later>:<session>' for
  -- the welcome.
  State     TEXT NOT NULL,
  Text      TEXT NOT NULL,
  Author    TEXT NOT NULL CHECK (Author IN ('owner', 'design', 'claude')),
  PRIMARY KEY (Lang, Id)
);

-- Full-text index over DhikrTranslations.SearchText.
CREATE VIRTUAL TABLE DhikrSearch USING fts5(
  SearchText,
  DhikrId UNINDEXED,
  Lang UNINDEXED,
  tokenize = 'unicode61 remove_diacritics 0'
);
`;
