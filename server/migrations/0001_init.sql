-- Site Blocks, Phase 1: drafts, preview links, claimed addresses, rate limits.
-- Plain SQLite: runs on D1 and on any SQLite host.

-- One row per site being built. The browser holds a secret key; only its hash is stored.
CREATE TABLE drafts (
  ref TEXT PRIMARY KEY,               -- random id used in storage paths
  key_hash TEXT NOT NULL UNIQUE,      -- sha256 of the browser's draft key
  record TEXT,                        -- the validated site record (JSON), null before the first save
  slug TEXT,                          -- where it is published, if it is
  created_at INTEGER NOT NULL,        -- ms since epoch
  updated_at INTEGER NOT NULL,
  published_at INTEGER
);

-- Shareable read-only preview links. Only token hashes are stored.
CREATE TABLE previews (
  token_hash TEXT PRIMARY KEY,
  ref TEXT NOT NULL REFERENCES drafts (ref) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX previews_expires_at ON previews (expires_at);

-- Site addresses (<slug>.<base domain>), one draft each.
CREATE TABLE slugs (
  slug TEXT PRIMARY KEY,
  ref TEXT NOT NULL REFERENCES drafts (ref) ON DELETE CASCADE,
  claimed_at INTEGER NOT NULL
);
CREATE INDEX slugs_ref ON slugs (ref);

-- Fixed-window request counters per action and caller address.
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,      -- seconds since epoch
  count INTEGER NOT NULL
);
