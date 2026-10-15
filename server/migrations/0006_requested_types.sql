-- "My business isn't listed": what visitors say their business is, with a count, so we know
-- which business types to add next. Anonymous: just the cleaned description (src/analytics/requested.ts
-- drops anything like an email, phone number or web address), the closest type we suggested,
-- and when it was first and last asked for. Nothing about who asked. Only adds a table.
-- Rows not asked for again in 13 months are deleted by the daily cron, like the funnel events.

CREATE TABLE requested_types (
  text TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  closest TEXT,
  first_at INTEGER NOT NULL,   -- ms since epoch
  last_at INTEGER NOT NULL
);
CREATE INDEX requested_types_count ON requested_types (count);
CREATE INDEX requested_types_last_at ON requested_types (last_at);
