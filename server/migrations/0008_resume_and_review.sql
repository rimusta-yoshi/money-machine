-- "Email me a link to finish on my computer", and the review flag on words like "bank" or
-- "password". Only adds columns and indexes: every existing record keeps working. All of it sits
-- on the draft's own row, so the unpaid 30-day cleanup deletes it with the draft.

-- The address the customer asked us to send the link to (unpaid sites only).
ALTER TABLE drafts ADD COLUMN resume_email TEXT;
-- When the current 24-hour sending window began, and how many links were sent in it (at most 3).
ALTER TABLE drafts ADD COLUMN resume_sent_at INTEGER;
ALTER TABLE drafts ADD COLUMN resume_sent_count INTEGER NOT NULL DEFAULT 0;
-- When to send the one reminder ("remind me" ticked), and when it went: never more than one.
ALTER TABLE drafts ADD COLUMN resume_remind_at INTEGER;
ALTER TABLE drafts ADD COLUMN resume_reminded_at INTEGER;
-- sha256 of the second draft key a resume link hands out (the computer's); the original stays.
ALTER TABLE drafts ADD COLUMN alt_key_hash TEXT;
CREATE INDEX drafts_alt_key_hash ON drafts (alt_key_hash);
CREATE INDEX drafts_resume_remind_at ON drafts (resume_remind_at);

-- Words that need a person to look (server/core/reviewWords.ts), found at checkout or publish.
-- Never shown to the customer and never blocks anything.
ALTER TABLE drafts ADD COLUMN review_words TEXT;           -- JSON array of the list entries found
ALTER TABLE drafts ADD COLUMN review_fp TEXT;              -- sha256 of the text checked: unchanged text is not flagged again
ALTER TABLE drafts ADD COLUMN review_flagged_at INTEGER;
ALTER TABLE drafts ADD COLUMN review_cleared_at INTEGER;   -- "Mark reviewed"; a later flag shows it again
CREATE INDEX drafts_review_flagged_at ON drafts (review_flagged_at);
