# Brief: customers connect their own domain (pre-launch)

Start from main (packs PR #30 merged). New branch, PR when done. Don't merge or deploy: the PM merges, rob approves deploys. Test mode, tester gate and noindex stay as they are.

## Why
rob wants own domains working before launch. The homepage already promises "connect a domain you own". Decided 15 Oct: **included in the £99, no fee, nothing monthly.** Cloudflare for SaaS gives 100 custom hostnames free, then $0.10/month each; we absorb that.

## How it works (Cloudflare for SaaS on the localblocks.co.uk zone)
- Each customer domain is a Cloudflare **custom hostname** on our zone, created through the Cloudflare API with a scoped API token (secret, e.g. `CF_SAAS_TOKEN`, plus the zone id as a var). The customer adds a CNAME pointing at our CNAME target (e.g. `domains.localblocks.co.uk`). Cloudflare validates and issues HTTPS automatically.
- Traffic for custom hostnames must reach the sites Worker (`server/wrangler.site.jsonc`). Work out the right routing (fallback origin with an originless record, a `*/*` route to the sites Worker, and make sure the apex app Worker, `api.` and `preview.` keep winning). Write exact setup steps for rob.
- The sites Worker looks up which site a custom hostname belongs to (D1 table, cached sensibly) and serves it exactly as it serves `<slug>.localblocks.co.uk`. Canonical URL, sitemap and Open Graph use the custom domain once it's active, and `<slug>.localblocks.co.uk` 301s to it. The "Made with Local Blocks" credit stays.
- **Bare domains:** most UK registrars can't CNAME the root. Default to `www.<domain>` and tell customers to switch on their registrar's free forwarding from the bare domain to www. If the customer's DNS is on Cloudflare (CNAME flattening), allow the bare domain too. Don't use apex proxying (Enterprise only).

## Customer flow (paid sites only, from the edit link)
1. "Use your own domain": type the domain. Validate it properly: a real public domain, not ours, not already connected to another site, punycode handled, sensible length limits. Rate-limit.
2. Show the record(s) to add, with copy buttons and short help for the big UK registrars (GoDaddy, 123-reg, IONOS, Namecheap, Cloudflare, Squarespace/Google Domains), including bare-domain forwarding. Plain, warm British English.
3. Status: "Waiting for your domain" → "Live", using Cloudflare's hostname + SSL status as the source of truth. Check on page load/refresh plus a light background check (cron), not tight polling.
4. Email when it goes live (Resend adapter, same style as the existing emails). One email, no reminders.
5. "Disconnect domain": removes the custom hostname and falls back to the free address.
- One custom domain per site (www + optional bare redirect counts as one).
- Refunds, takedowns, disputes and the 30-day/90-day cleanups must remove or pause the custom hostname, so we never keep serving (or paying for) a domain that isn't a live customer's.
- Admin: the dashboard shows how many custom domains are connected (so rob can watch the 100 free limit), and the admin key can disconnect one.

## Wording to update
- Homepage domain lines, the FAQ ("Can I use my own domain name?"), the hosting guide intro, and the type pages' FAQs if they mention domains: all must match what's built.
- Terms/privacy: draft wording (marked for rob's legal check, don't publish silently) saying the customer owns and renews their domain, we're not responsible for their registrar, and we store the domain name. Put drafts in the PR description.

## Rules
- No secrets in code, logs or output. Fake the Cloudflare API in tests (like the fake Stripe). Validate every input with zod. Admin endpoints need the admin key.
- Migration as a normal file in server/migrations (adds only); call it out. Don't run it against production.
- Accessibility (axe) on the new screens, desktop and phone. Tests for the hostname lifecycle (connect → pending → active → disconnect; refund/takedown removes it; host lookup and 301 from the free address).
- Don't change pricing, payments, or generator output.

## Done when
A paid test site can connect a domain end to end against the faked Cloudflare API, all lifecycle paths are tested, wording is consistent, and all tests + the quick stress test pass. Finish with: a 5-line summary, what differs from this brief, rob's exact click-by-click Cloudflare setup steps and `npx wrangler secret put` commands (never values), deploy order (migrate → API → sites → app), open questions split technical vs product/legal, and phone screenshots of the connect screen saved in docs/pm/screenshots/.
