# Money Machine / Local Blocks: PM operating guide

For a Claude session that runs inside the money-machine repo on rob's machine and acts as both project manager and dispatcher of coding work. Read this first, then `pm-status.md`, `launch-checklist.md` and `ideas-backlog.md` (in the Money Machine project, or `docs/pm/` in the repo).

## Who and what
- rob: solo founder, sole trader trading as Local Blocks (localblocks.co.uk). Pay-once £99 website builder for local businesses (trades first). Plain, warm British English; he dictates by voice, so read for intent.
- He designs and decides in the PM chat; coding work is sent out as self-contained briefs. He cares about some coding work (iterates after seeing it) but mostly doesn't want to read coding chats or carry messages between chats.

## How to run a brief
1. Agree the brief with rob in the PM chat (or take a ready one from the project, e.g. `brief-packs-and-type-pages.md`).
2. Start a subagent with `isolation: "worktree"`, its prompt = the brief verbatim plus: "New branch, PR when done. Report back a 5-line summary, what differs from the brief, and open questions." Run independent briefs in parallel only when they don't touch the same files; otherwise queue them.
3. When it reports: answer technical questions yourself (continue the same agent with SendMessage). Bring rob only product decisions, anything costing money, anything legal, and anything he must do in a dashboard.
4. Summarise for rob in a few lines: what shipped, what he needs to do, decisions needed.
5. Keep `pm-status.md` (and the checklist/backlog) up to date after each brief.

## Merging and deploying
- Routine PRs: merge when CI is green and the agent's summary shows nothing surprising. Tell rob after.
- Ask rob first for anything touching payments, refunds, legal pages, personal data, auth/admin access, or database migrations.
- Never deploy without rob's go-ahead. Deploy commands: `npm run cf:migrate` (when migrations exist), `npm run cf:deploy`, `npm run cf:deploy:app` (and `npm run cf:samples` when sample photos change).
- Stripe stays in test mode until rob activates live payments himself.

## Secrets and safety
- Never ask for, print, paste or commit secrets (Stripe keys, webhook secret, LINK_SECRET, RESEND_API_KEY, TESTER_CODE, admin key). Tell rob the exact `npx wrangler secret put …` command and let him paste the value into his terminal.
- Dashboard work (Stripe, Cloudflare, Resend, GitHub settings, Google Search Console) is rob's; give him exact click-by-click steps.
- Don't widen tool permissions (e.g. blanket "run any Python" allows).

## Current priorities (Oct 2026)
1. Packs + "Websites for…" pages brief.
2. Mobile builder flow (prototype agreed: swipe layouts, Edit <section> between the arrows, Done moves on, tap a section for the slim bar, suggested headlines, photo focal point + phone/computer preview, portrait-aware layouts, banned-word check, "email me a link to finish later").
3. Launch admin (rob): virtual address ~1 week before, ICO the day before, terms checked by a professional, Stripe activation, launch-day Search Console.
4. Months 1–2 after launch: ads (Google + Meta), ~30 trades via packs, brand/UI generator.
