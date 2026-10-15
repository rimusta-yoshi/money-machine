# Launch checklist (before the first real paying customer)

Two tracks meet at "switch on live payments". The build track runs in Stripe test mode; this list is the launch track, mostly rob's admin.

## Free help first: NUA Ideas Factory (rob is an alumnus)
Cavendish House, 28-32 St Andrews Street, Norwich NR2 4AE · 01603 753285. One-to-one business advice for NUA graduates, plus a membership with hot desks and meeting rooms (alumni terms unpublished, so ask). Before paying for any of these, ask them:
- [ ] Can a member use the building as a business address (terms, footer, Stripe)? Could replace the paid virtual address.
- [ ] A check of the terms and privacy policy, or a referral to someone who does it cheaply.
- [ ] An accountant introduction; sole trader vs limited company; VAT timing (see milestones.md).
- [ ] Grants or start-up funding for creative digital businesses.
- [ ] Local businesses (or students) to try the builder before launch.

## Key dates and facts
- **Business start date: 10 October 2026** (Local Blocks, sole trader). Used on the Monzo Business application; use the same date when registering with HMRC (or the first-sale date if HMRC asks for that).
- Domain localblocks.co.uk bought Oct 2026 (UK Sole Trader, rob's name). Stripe sandbox account created Oct 2026 (personal email login).
- Monzo Business application (10 Oct 2026) answers: sole trader, home address, IT infrastructure/hosting services, customers mostly businesses, card payments online, income £0–15k, no international payments, ~£300/month in+out, Lite plan. Approved Oct 2026; card arrived 13 Oct (to activate).
- Support inbox: localblocks.hello@gmail.com (free Gmail, personal-use type). Cloudflare Email Routing on localblocks.co.uk: hello@ and abuse@ → that Gmail (tested); catch-all off. Account logins (Stripe, Cloudflare, domain) stay on rob's personal email.
- Support promise: reply within 5 working days; rob checks the inbox weekly (Monday). Gmail phone notifications on for abuse@ only. Optional always-on auto-reply pointing to self-serve refunds/edit links.

## Timing rob chose (pay for things as late as sensible)
- **~1 week before launch:** virtual business address (ID checks can take days; address goes into terms, footer, Stripe activation).
- **Day before launch:** ICO data protection fee (tier 1, ~£52/yr).
- **When the Monzo card is activated:** switch Cloudflare/Resend billing to it.

## Name and domain
- [x] Launch name **Local Blocks** (Oct 2026). UK IPO search clean. Sound-alike to watch: "LocalBlox".
- [x] Bought localblocks.co.uk on Cloudflare (UK Sole Trader, rob's name). localblocks.uk skipped for now.
- [x] Renamed and moved to localblocks.co.uk (PR #24, 12 Oct). siteblocks.co.uk 301s everything; keep it renewing until at least Oct 2027.
- [x] Domain auto-renew on. Switch the renewal card to the Monzo Business card when activated.
- [x] hello@ and abuse@ via Cloudflare Email Routing (tested). Resend sending domain verified; emails come from Local Blocks <hello@localblocks.co.uk>.
- [ ] Optional, before serious ad spend: UK trade mark "Local Blocks" (classes 42 + 35; ~£205 + £60, fees from Apr 2026).

## Legal and admin
- [x] Privacy policy and terms drafted and on the site at /privacy and /terms (14 Oct) with placeholders; build refuses to launch with blanks.
- [x] "By paying you agree to our terms" line at checkout; footer links everywhere.
- [ ] Fill placeholders in src/brand/config.ts: full name, business address, ICO number, date.
- [ ] Quick professional check of privacy policy + terms (fixed-fee review; ask about consumer cancellation wording at checkout).
- [ ] ICO data protection fee (day before launch), paid from the business account.
- [ ] Virtual business address (~1 week before launch).
- [ ] Register with HMRC as a sole trader once trading (start date above); keep simple records.
- [x] Separate bank account: Monzo Business Lite.
- [ ] Move business costs onto the Monzo Business card once activated.

## Payments
- [ ] Stripe public details: Local Blocks, https://localblocks.co.uk, hello@localblocks.co.uk, statement descriptor LOCALBLOCKS (some may only be settable at activation).
- [ ] Stripe account activated (sole trader, Local Blocks, ID, Monzo Business details). After legal pages + virtual address are on the site.
- [ ] Paid developer review of payments, security and privacy, before live keys.
- [ ] Switch to live keys; set LAUNCHED on.

## Safety and operations
- [ ] **Make the GitHub repo private** (it's public: generator code + 50 Pexels photos). Then watch GitHub Actions minutes (free private allowance ~2,000/month); full stress shards nightly/on main only.
- [ ] Update GitHub required status checks when the CI change (feat/credit-cleanup-ci) lands, or every PR gets stuck.
- [ ] Cloudflare Access on localblocks.co.uk/admin (one-time email code, rob only).
- [ ] Cloudflare Web Analytics: add localblocks.co.uk, send token to the coding work.
- [ ] Abuse takedown routine: check report → take site down via admin key → reply. Banned-word check flags suspicious sites (mobile brief).
- [ ] Backups of D1 site records and R2 photos.
- [ ] Delete pre-launch test sites before launch (admin delete endpoints/script on feat/credit-cleanup-ci).
- [x] Remove the 'Bash(python -)' allow entry from .claude/settings.local.json (14 Oct).
- [x] Billing alert on. Upgrade to Workers Paid at launch / before a big ad push.

## Launch day (steps also in server/README.md "Launch day")
1. Fill legal details; set LAUNCHED "true" and both NOINDEX "false"; npm run cf:deploy and npm run cf:deploy:app.
2. Search Console → Add property → Domain → localblocks.co.uk; copy the TXT record.
3. Cloudflare DNS → Add record: TXT, name @, paste value (leave SPF alone).
4. Verify (retry after 10 min if needed); keep the record.
5. Sitemaps → submit sitemap.xml; optionally request indexing for the homepage.
6. Start the first £10–50 ad test with ?src= tags; watch /admin.

## Build track
Done: payments, reliability, dashboard, rename, legal pages + download + hosting guide. In flight: feat/credit-cleanup-ci (Made with link, test-site deletion, CI split). Next: packs + type pages → mobile builder flow → launch → months 1–2: ads, ~30 trades via packs, brand generator.

## Later
Professional indemnity insurance, VAT (threshold £90k turnover), old-address redirects, own-domain support (Cloudflare for SaaS), close-down page, localblocks.uk, QR "add photos from your phone", Phases 3–5.
