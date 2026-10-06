-- Phase 2: paying publishes a site. Payments on the site record, checkouts, address holds,
-- processed Stripe events. Only adds columns and tables: every existing record keeps working.

-- Who paid, and what happened since. All null until a checkout completes.
ALTER TABLE drafts ADD COLUMN email TEXT;                   -- the payment email (receipt, edit link, refunds)
ALTER TABLE drafts ADD COLUMN seen_at INTEGER;              -- last time the builder used this draft (ms), for cleanup
ALTER TABLE drafts ADD COLUMN paid_at INTEGER;
ALTER TABLE drafts ADD COLUMN stripe_session_id TEXT;
ALTER TABLE drafts ADD COLUMN stripe_payment_intent TEXT;
ALTER TABLE drafts ADD COLUMN amount INTEGER;               -- pence
ALTER TABLE drafts ADD COLUMN currency TEXT;
ALTER TABLE drafts ADD COLUMN welcome_sent_at INTEGER;
ALTER TABLE drafts ADD COLUMN refunded_at INTEGER;
ALTER TABLE drafts ADD COLUMN refund_id TEXT;
CREATE UNIQUE INDEX drafts_payment_intent ON drafts (stripe_payment_intent);
ALTER TABLE drafts ADD COLUMN link_version INTEGER NOT NULL DEFAULT 0; -- bumped to cut off old edit links
CREATE INDEX drafts_email ON drafts (email COLLATE NOCASE);
-- Drafts from before: counted as used today, so cleanup gives them the full 30 days.
UPDATE drafts SET seen_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE seen_at IS NULL;

-- An address held while a checkout is open (null: claimed for good, as before).
ALTER TABLE slugs ADD COLUMN held_until INTEGER;

-- Checkout sessions we opened, with the checked record they will publish.
CREATE TABLE checkouts (
  session_id TEXT PRIMARY KEY,
  ref TEXT NOT NULL REFERENCES drafts (ref) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  email TEXT NOT NULL,
  record TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX checkouts_ref ON checkouts (ref);

-- Stripe events already handled, so a repeat does nothing.
CREATE TABLE stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at INTEGER NOT NULL
);
