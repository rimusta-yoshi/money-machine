-- Phase 2 follow-up: disputes, partial refunds, edit links that are cut off when a newer one is
-- opened. Only adds columns: every existing record keeps working.

-- drafts.link_version (0002) now counts edit links issued; links numbered below link_floor no
-- longer work (it rises to a link's number when that link is opened).
ALTER TABLE drafts ADD COLUMN link_floor INTEGER NOT NULL DEFAULT 0;
-- Pence refunded so far by partial refunds (a full refund sets refunded_at instead).
ALTER TABLE drafts ADD COLUMN refunded_amount INTEGER;
-- A payment dispute (chargeback): the site is down while one is open, and stays down if it's lost.
ALTER TABLE drafts ADD COLUMN disputed_at INTEGER;
ALTER TABLE drafts ADD COLUMN dispute_lost_at INTEGER;
CREATE INDEX drafts_refunded_at ON drafts (refunded_at);
