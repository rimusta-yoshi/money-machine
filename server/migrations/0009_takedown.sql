-- Admin "take down" and "restore" (abuse: phishing, scams, illegal content): a site is pulled
-- without a refund and can be put back exactly. Only adds columns and an index: every existing
-- record keeps working, and nothing is deleted when a site is taken down.

-- Set while the site is taken down; cleared again by "restore".
ALTER TABLE drafts ADD COLUMN taken_down_at INTEGER;
-- The latest take-down: why (free text from the admin) and who did it. Kept after a restore.
ALTER TABLE drafts ADD COLUMN takedown_reason TEXT;
ALTER TABLE drafts ADD COLUMN takedown_by TEXT;
-- The latest restore: when and who.
ALTER TABLE drafts ADD COLUMN restored_at INTEGER;
ALTER TABLE drafts ADD COLUMN restored_by TEXT;
-- Every take-down and restore, oldest first: JSON [{"action","at","by","reason"}].
ALTER TABLE drafts ADD COLUMN takedown_log TEXT;
CREATE INDEX drafts_taken_down_at ON drafts (taken_down_at);
