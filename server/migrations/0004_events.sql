-- The admin dashboard: anonymous funnel events, layout picks, and the ad source on each site.
-- Nothing personal: no names, emails, phone numbers, IP addresses or browser details.
-- Only adds columns and tables: every existing record keeps working.

-- Which ad (or link) a site came from, kept so paid, refunded and disputed events inherit it.
ALTER TABLE drafts ADD COLUMN src TEXT;
ALTER TABLE drafts ADD COLUMN campaign TEXT;
CREATE INDEX drafts_created_at ON drafts (created_at);
CREATE INDEX drafts_paid_at ON drafts (paid_at);

-- One row per funnel step reached. ref is the site's random id when there is one (no foreign
-- key: counts outlive drafts cleaned up after 30 days). Kept 13 months.
CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  step TEXT NOT NULL,
  at INTEGER NOT NULL,                -- ms since epoch
  trade TEXT,
  theme TEXT,
  src TEXT,
  campaign TEXT,
  ref TEXT
);
CREATE INDEX events_at ON events (at);
CREATE INDEX events_ref_step ON events (ref, step);
CREATE INDEX events_src_at ON events (src, at);

-- Which layout was kept in each section, to learn which layouts win. Kept 13 months.
CREATE TABLE layout_picks (
  id INTEGER PRIMARY KEY,
  at INTEGER NOT NULL,
  section TEXT NOT NULL,
  layout TEXT NOT NULL,
  theme TEXT,
  trade TEXT,
  src TEXT,
  ref TEXT
);
CREATE INDEX layout_picks_at ON layout_picks (at);
