# Backups: what's protected and what to do if something goes wrong

The short version: every night at about 3am (UK winter time; 4am in summer) the server copies
the database and customers' websites and photos into a separate storage bucket. If something
gets deleted or broken, Claude can put it back with a few commands. You don't need to do
anything day to day.

## What's protected, and for how long

| What | Can go back | How far back |
|---|---|---|
| All site records, payments, edit links, own domains (the database) | to any minute | 30 days (once we're on Workers Paid; 7 days until then) |
| The same, as a nightly copy | to any night | 30 days |
| Paid and published sites' records | to the start of any month | 12 months |
| Published websites and the photos of paid or published sites | to the latest copy, or as they were on a date | deleted or changed files: 30 days |

Not copied: the builder's sample photos (we can upload them again), and unfinished sites'
photos (nobody has paid yet).

## Is it working?

The admin dashboard says **Last backup: (date and time) ✓** under its heading. A **✗** means
something is wrong: ask Claude to "check the backups" (it runs `npm run backup -- verify` and
reads the logs). A ✗ for a day is not an emergency, but get it looked at that week.

## If something goes wrong

Tell Claude what happened, roughly when, and which site(s). For example:

- "Joe's Plumbing's site has disappeared since yesterday. Please restore it from the backups."
- "The last deploy broke the database at about 9:30 this morning. Please put it back to 9:15."
- "A customer says their photos are gone. Their address is joes-plumbing."

Claude follows "Backups and restore" in `server/README.md`. It always shows you what it would
change first and only changes the live site when you say yes. Going back to an earlier time
undoes everything after it (including new orders), so Claude will check Stripe afterwards for
any payments made in between.

## Privacy

Backups are copies of the same personal information the site holds (customers' emails,
business details, photos). They're deleted on the schedule above, automatically. When someone
asks for their data to be deleted, it goes from the live site straight away and from the backups
when they expire (at most 30 days for unfinished sites, 12 months for paid ones; if backups ever
stop working, the last good one is kept until they're fixed). The privacy
policy should say this: a draft line is in the backups pull request for your legal check.

## One-off setup (Claude or the PM does this at deploy)

1. Create a storage bucket called `siteblocks-backups` in the Cloudflare dashboard (R2).
2. Deploy, then run the first backup and check it.

Cost: pennies a month at our size (R2 storage is $0.015 per GB a month after the free 10 GB).
