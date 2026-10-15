# Publishing server (Phases 1 and 2)

Two Cloudflare Workers, one D1 database, one R2 bucket, Stripe Checkout and an email sender.
Paying is what publishes a site: the Stripe webhook puts it live. The admin key still publishes
without paying, for testing and support only (the public builder never shows it).

| Host | Worker | What it does |
|---|---|---|
| `api.localblocks.co.uk` | `siteblocks-api` | The builder's API: photo uploads, preview links, address checks, checkout, the Stripe webhook, edit links, refunds, re-publishing. Also serves the builder's sample photos (`/samples/<file>`). |
| `preview.localblocks.co.uk` | `siteblocks-api` | Preview links (`/<token>/`), rendered live from the latest save, plus draft photos. Always noindex. |
| `<slug>.localblocks.co.uk` | `siteblocks-sites` | Published sites: static files straight from R2. Never renders. `www.` redirects to the homepage. A site with its own domain live 301s there. |
| customers' own domains | `siteblocks-sites` | The same sites at `www.<their domain>` (Cloudflare for SaaS custom hostnames, the `*/*` route). Reads D1 only to know which site a domain shows (remembered a minute). See "Own domains". |
| `localblocks.co.uk` | `siteblocks-app` | The homepage and builder (`npm run build` output), static files only. Deploy with `npm run cf:deploy:app`; settings in `.env.production`. |

```
builder ──POST photos────▶ API worker ──bytes──────▶ R2 drafts/<ref>/photos/<hash>.webp
        ──PUT /v1/draft──▶            ──parseSite──▶ D1 (only before a preview link or a checkout)
        ──checkout───────▶            ──Stripe─────▶ Checkout Session (£99 from config) ──▶ customer pays on Stripe
Stripe  ──webhook────────▶            ──src/gen────▶ R2 sites/<slug>/… ; D1 payment ; welcome email
visitor ──<slug>.localblocks.co.uk──▶ site worker ──▶ R2 sites/<slug>/…   (+ /fonts from the deployed assets)
```

### How paying works

0. **Before launch** (`LAUNCHED` is `false`): a checkout needs the tester code (`TESTER_CODE`
   secret), typed on the go-live step or given in a link, `/build/?tester=<code>`. Without it the
   go-live step says "We're not taking orders yet" and no Checkout Session is created. The builder
   reads the price and the launch flag from `GET /v1/config`; the price is set only in
   `PRICE_PENCE` (the homepage and builder are also built with that value).
1. **Go live for £99**: the builder sends the checked record (`PUT /v1/draft`), then
   `POST /v1/draft/checkout {slug}`. The server checks the site is ready, holds the address for
   45 minutes (nobody else can check out or publish it meanwhile) and opens a Stripe Checkout
   Session (payment mode, GBP, `PRICE_PENCE`, the site's email prefilled, metadata = draft ref +
   slug). The builder never sends an amount. Card details only ever go to Stripe.
2. Stripe sends the customer back to `/build/?paid=<session id>`, which polls
   `GET /v1/checkouts/<id>` until the site is live. Cancelling returns to `/build/?checkout=cancelled`:
   the go-live step with everything kept (the builder keeps the site in the browser).
3. **The webhook** (`POST /v1/stripe/webhook`) is the only thing that publishes a paid site. It
   refuses anything without a valid, recent Stripe signature, and records each event id in D1 so
   a repeat does nothing. `checkout.session.completed` (paid) records the payment on the draft,
   publishes the record checked at checkout, and sends the welcome email once. If the same site is
   paid for twice (two tabs), the second payment is refunded straight away.
4. **Edit link** (`/build/#edit=<token>`, in the welcome email): opens the paid site in the builder
   on any device. *Publish changes* re-publishes free, at the address paid for (changing the
   address needs the admin key until redirects exist). "Lost your edit link?" (`/build/#lost-link`)
   emails a new, numbered link to the payment email only, answering the same either way. Asking
   revokes nothing; opening a link cuts off every link issued before it.
5. **Refund link** (`/build/#refund=<token>`): valid 14 days from payment (`REFUND_DAYS`), works once.
   It refunds the full amount through Stripe (idempotency key per payment), takes the site down
   (the address says "This site is no longer available") and emails a confirmation.
   `charge.refunded` does the same for refunds made in the Stripe dashboard, and copes with the
   refund link having done it already. Partial refunds leave the site up and are recorded
   (`drafts.refunded_amount`). A refunded address is freed for anyone 90 days after the refund.
6. **Disputes** (chargebacks): `charge.dispute.created` takes the site down the same way, and the
   owner can't re-publish or self-refund meanwhile, and is emailed once that the site is paused
   (with the support address). `charge.dispute.closed` with status `won` puts the site back as it
   was and emails them that it's back; `lost` leaves it down, and the address is freed 90 days
   after the dispute closed, as after a refund.

Edit and refund links are HMAC-signed with `LINK_SECRET` (rotating it invalidates every link).
Paid sites stay `noindex` while `NOINDEX` is `true`; unpaid sites published with the admin key
are always `noindex`.

### Drafts and cleanup

The builder autosaves in the browser only. The server holds a copy of the record just for
preview links and checkouts (photos are uploaded as they're added, so the record kept in the
browser stays small). The daily cron (03:17 UTC) deletes unpaid, never-published drafts not used
for 30 days, with their photos, and photos left behind by drafts that no longer exist. Paid sites
(refunded ones too) and published sites are never deleted automatically.

### Download your site

A paid, live site can be downloaded as a .zip: **Download your site** on the go-live step (when
opened with the edit link or in the browser that paid), or the link in the welcome email and in
every "your edit link" email (`/build/#download=<edit token>`, the edit link's own key; a bare
`/build/#download` asks for a new edit link, so a future "site closed" page can link there).

`GET /v1/draft/export` (draft key or edit link) checks the site is paid, not refunded or
disputed and not taken down, counts the download (10 per site per day, plus 60 an hour per
address), then answers with the published `index.html`, `privacy.html`, stylesheet and icon
made portable (`src/publish/portable.ts`: relative links; the robots, canonical and `og:url` /
`og:image` tags left out, since they name our address), a `README.txt`, and the photos and
fonts (with their licence) to fetch from the live site. The builder fetches those (photos and
fonts send `Access-Control-Allow-Origin: *`) and zips everything in the browser
(`src/publish/zip.ts`, stored, no compression), so the worker does no heavy work. The zip opens
offline from a folder; `e2e/publish.e2e.test.ts` checks that in Chrome.

## Layout

- `server/core/`: everything the server does, written against plain interfaces (`ports.ts`) and
  web-standard `Request`/`Response`. No Cloudflare imports.
- `server/cloudflare/`: the thin adapter. D1, R2 and the assets binding behind those interfaces,
  and the two Worker entry points. Moving host means rewriting only this folder.
- `server/migrations/`: plain SQLite.
- `src/publish/`: the static-site renderer (documents, meta tags, privacy notice, sitemap,
  robots, address rules). Shared with the builder; no DOM, no measuring.
- The base domain is one setting: `BASE_DOMAIN` in both wrangler configs (plus the route patterns).

Every record is validated on the server with `parseSite`, as the builder does. Photos must be
this draft's own uploads (checked by their bytes, max 2 MB, 60 per draft). Records max 256 KB.
The browser holds the draft key; the database stores only hashes of keys and preview tokens.
Server code lives in `server/core/`: `checkout.ts`, `webhook.ts`, `account.ts` (welcome email,
edit links, refunds), `stripe.ts` (Stripe over plain fetch, no SDK), `email.ts` (Resend, or the
log), `cleanup.ts`.

## Tests

```bash
npm test
```

Runs everything, including `server/test/api.test.ts` and `server/test/payments.test.ts`: both
workers under Miniflare (the Workers runtime) with local D1 and R2, and a fake Stripe and Resend
(`server/test/fakeStripe.ts`) answering the worker's outgoing requests.

```bash
npm run e2e
```

Real Chrome: builds a site in the actual builder, makes a preview link, goes through checkout
(Stripe's page stood in for, the webhook signed by the test), sees it live, opens the edit link
in a second browser and publishes a change, then refunds it with the refund link. It also visits
`<slug>.localblocks.localhost` over HTTPS and runs axe (with colour contrast) on the published
pages and preview links, desktop and phone, every theme. Screenshots go to `e2e/screens/`.

## Try it locally

```bash
npm run dev:stack
```

```bash
npm run dev:api
```

The first runs both workers on `https://*.localblocks.localhost:8787` (self-signed: open
`https://api.localblocks.localhost:8787/health` once and accept the warning, and the same for
`preview.` and each site address). The second runs the builder against it. The local admin key
is printed by `dev:stack`.

### Payments locally (Stripe test mode)

1. Install the Stripe CLI (https://docs.stripe.com/stripe-cli) and run `stripe login` once.
2. Create `server/.dev.vars` (git ignores it; never commit it or paste it anywhere). Your test
   secret key is in the Stripe dashboard → **Developers** → **API keys**, with **Test mode** on:

   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   LINK_SECRET=any-long-random-string-of-32-or-more-characters
   TESTER_CODE=any-code-of-8-or-more
   ```

   Then open the builder as `http://localhost:5173/build/?tester=<that code>` (or set
   `LAUNCHED=true` in the same file).

   `RESEND_API_KEY=re_...` is optional: without it every email is written to the `dev:stack`
   terminal instead (with its edit and refund links), which is all local testing needs.
3. Start the webhook forwarding and copy the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET`:

   ```bash
   stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,charge.refunded,charge.dispute.created,charge.dispute.closed --forward-to https://127.0.0.1:8787/v1/stripe/webhook --skip-verify
   ```

   (`127.0.0.1`, not the `.localhost` name: the CLI can't resolve it; `--skip-verify` accepts the
   local self-signed certificate.)
   That's only needed once (the secret stays the same on this computer). From then on, one
   command starts everything (the server, the builder and the forwarding); Ctrl+C stops it all:

   ```bash
   npm run dev:pay
   ```

   If the builder says it can't reach the local server, Chrome has forgotten that you accepted the
   local certificate (it does after a while, or after a restart): open
   https://api.localblocks.localhost:8787/health, choose **Advanced** → **Proceed**, and retry.

4. Open http://localhost:5173/build/, build a site, and press **Go live for £99** (leave the
   admin key empty). On Stripe's page pay with a test card:

   | Card | What happens |
   |---|---|
   | `4242 4242 4242 4242` | Pays |
   | `4000 0025 0000 3155` | Asks for 3-D Secure, then pays |
   | `4000 0000 0000 9995` | Declined (insufficient funds) |

   Any future expiry date, any CVC, any postcode. More: https://docs.stripe.com/testing
5. You land on "Payment received, publishing your site…", then the live link. The welcome email
   (in the terminal) has the edit and refund links. A refund made in the Stripe dashboard
   (**Payments** → the payment → **Refund**) takes the site down too. To replay an event:
   `stripe events resend evt_...`.

## Cloudflare setup (one-off)

Everything below happens once. Steps 1 to 4 are clicks in the dashboard; 5 to 7 are commands.

### 1. API token for wrangler

1. Go to https://dash.cloudflare.com, click your profile icon (top right) → **My Profile** → **API Tokens**.
2. **Create Token** → next to **Edit Cloudflare Workers**, click **Use template**.
3. Under **Permissions**, click **+ Add more** and add **Account · D1 · Edit**. (The template
   already has Workers Scripts, Workers R2 Storage and Workers Routes.)
4. **Account Resources**: Include → your account. **Zone Resources**: Include → Specific zone →
   `localblocks.co.uk`.
5. **Continue to summary** → **Create Token**. Copy it now (it's shown once) into your password manager.
6. In the PowerShell window you'll deploy from:

   ```powershell
   $env:CLOUDFLARE_API_TOKEN = "paste-the-token-here"
   ```

   (Only for that window. Never put it in a file in the repo.)

### 2. D1 database

1. Dashboard → **Storage & Databases** → **D1 SQL Database** → **Create**.
2. Name: `siteblocks`. Location: leave automatic (or pick Western Europe). **Create**.
3. Copy the **Database ID** from its page and paste it into `server/wrangler.api.jsonc` in place
   of `REPLACE_WITH_D1_DATABASE_ID` (it isn't secret; commit it, or send it to Claude).

### 3. R2 bucket (and the builder's sample photos)

1. Dashboard → **Storage & Databases** → **R2 Object Storage**. If asked, enable R2 (the free
   tier needs a card on file; this use stays inside it).
2. **Create bucket** → name `siteblocks` → Location: Automatic → Default storage class: Standard → **Create bucket**.
3. Leave **Public access** off and add no CORS rules. Nothing is served from the bucket
   directly: the workers serve everything, and the API's `BUILDER_ORIGINS` setting is what
   allows the builder to fetch the sample photos.
4. The sample photos (50, matched to trades; see `reference/sample-photos/LICENCE.md`) are uploaded in step 6 by a script. Run it again whenever photos are added: the API only serves the files the builder lists.

### 4. Wildcard DNS record

1. Dashboard → **localblocks.co.uk** → **DNS** → **Records** → **Add record**.
2. Type **AAAA**, Name `*`, IPv6 address `100::`, Proxy status **Proxied** (orange cloud), TTL Auto → **Save**.

   `100::` is a "nowhere" address: every subdomain goes to Cloudflare, and the workers answer.
3. **SSL/TLS** → **Edge Certificates**: the Universal certificate should list
   `*.localblocks.co.uk, localblocks.co.uk` (can take 15 minutes after the first wildcard record).

Worker routes need no clicks: `wrangler deploy` creates them from the configs
(`api.` and `preview.` → `siteblocks-api`, `*.localblocks.co.uk/*` → `siteblocks-sites`; the
more specific routes win). After deploying you can see them under **Workers & Pages** →
each worker → **Settings** → **Domains & Routes**.

### 5. Create the tables and deploy

```bash
npm run cf:migrate
```

```bash
npm run cf:deploy
```

### 6. Sample photos and admin key

```bash
npm run cf:samples
```

Make a long random admin key and store it as a secret (paste it when asked; keep a copy in
your password manager, you'll type it in the builder to publish):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

```bash
npx wrangler secret put ADMIN_TOKEN -c server/wrangler.api.jsonc
```

### 7. Point the builder at it

Create `.env.local` in the repo root (git ignores it):

```
VITE_API_URL=https://api.localblocks.co.uk
VITE_SAMPLE_PHOTOS_URL=https://api.localblocks.co.uk/samples
```

Then `npm run dev`, build a site, and on the go-live step use **Get a preview link** (open it on
your phone), then **Go live for £99** (a test card, once the payment secrets below are set) or,
on a dev build, fill in the admin key to publish without paying. It goes live at
`https://<address>.localblocks.co.uk`.

Check: https://api.localblocks.co.uk/health answers `{"ok":true}`.

## Settings

| Variable | Where | Meaning |
|---|---|---|
| `BASE_DOMAIN` | both configs | `localblocks.co.uk`. Change here and in the route patterns to move domain. |
| `BUILDER_ORIGINS` | API config | Comma-separated origins allowed to call the API (default `http://localhost:5173`). Add the builder's address when it's hosted. |
| `NOINDEX` | both configs | `true` until launch: noindex headers and meta tags, robots.txt disallows everything. Always the opposite of `LAUNCHED` (a test checks). |
| `PREVIEW_DAYS` | API config | How long preview links work (30). |
| `BRAND_NAME` | tests only | Overrides the product's name. Not set in production: the name comes from `src/brand/config.ts`, like the domain and email. |
| `APP_URL` | API config | Where the homepage and builder live: Stripe's return pages and the links in emails. |
| `PRICE_PENCE` | API config | The one price, in pence (`9900`). The only place it's set: the builder asks the server (`GET /v1/config`), and the homepage and builder are built with it. |
| `LAUNCHED` | API config | `false` until launch: checkouts need the tester code. `true` takes orders from everyone, and the next homepage build opens it to search engines (see "Launch day"). |
| `REFUND_DAYS` | API config | How long the self-serve refund link works after paying (`14`). |
| `EMAIL_FROM`, `SUPPORT_EMAIL` | API config | Sender of every email, and the address replies and "get in touch" go to. |
| `ADMIN_TOKEN` | API secret | Publishing without paying, for testing and support, and reading the admin dashboard. Unset: both closed. |
| `STRIPE_SECRET_KEY` | API secret | `sk_test_…`. Unset: checkout says payments aren't open. A live key (`sk_live_…`) is refused unless `STRIPE_ALLOW_LIVE=true`. |
| `STRIPE_WEBHOOK_SECRET` | API secret | `whsec_…`, from the webhook endpoint in the Stripe dashboard. |
| `LINK_SECRET` | API secret | Signs edit and refund links (32+ characters). Needed when payments are on. |
| `TESTER_CODE` | API secret | Lets testers check out before launch (8+ characters). Unset: nobody can until `LAUNCHED` is `true`. |
| `RESEND_API_KEY` | API secret | Sends email through Resend. Unset: emails are written to the worker's log instead (fine for testing, not for customers: the log then holds their links). |
| `CF_SAAS_TOKEN` | API secret | Cloudflare API token for custom hostnames (own domains). Unset: own domains are off (the page says "not switched on yet"). |
| `CF_ZONE_ID` | API config | The `localblocks.co.uk` zone's id (not secret). Needed with `CF_SAAS_TOKEN`. |
| `DOMAINS_TARGET` | API config | What customers point their `www` at: `domains.localblocks.co.uk` (the template in `server/domainconnect/` names the same; a test checks). |
| `DC_PROVIDERS`, `DC_KEY_HOST`, `DC_PRIVATE_KEY` | API config / secret | One-click domains (Domain Connect): see `docs/domain-connect.md`. |
| `HOST_CACHE_SECONDS` | site config | How long the site worker remembers which site an own domain shows (`60`). |

A daily cron (03:17 UTC) clears expired preview links, address holds and rate-limit counters,
deletes dashboard events older than 13 months (and requested business types not asked for
since), then runs the cleanup above.

## Moving to localblocks.co.uk (October 2026)

The product is now **Local Blocks** at **localblocks.co.uk**. The name, domain and email live in
`src/brand/config.ts`; the wrangler configs name the same domain (`src/brand/brand.test.ts`
checks they agree). `siteblocks.co.uk` stays registered and redirects everything for at least a
year (until October 2027): `old-domain-redirect` (`server/wrangler.redirect.jsonc`) sends every
address to the same path and query on the new domain, `<slug>.`, `api.` and `preview.` included
(`www.` goes to the homepage). Pages get a 301; posts get a 308, which keeps their method.

The database, storage bucket and worker names stay `siteblocks…`: nobody sees them, and keeping
them keeps all the (test) data as it is. Test sites now answer at `<slug>.localblocks.co.uk`; their
pages still link the old domain until they're republished, and the redirect covers that. Sites
kept in a browser by the builder on the old address don't carry over (browser storage belongs to
an address); none are real.

### Your checklist, in order

**1. DNS for the new domain** (Cloudflare → **localblocks.co.uk** → **DNS** → **Records**)

- Leave the Email Routing records alone: the `MX` records and the `TXT` `v=spf1 …` on
  `localblocks.co.uk`.
- **Add record**: type **AAAA**, name `*`, IPv6 address `100::`, **Proxied** (orange cloud),
  TTL Auto. This sends every subdomain (`api.`, `preview.`, customers' sites) to the workers.
- **SSL/TLS → Edge Certificates**: wait until the Universal certificate lists
  `*.localblocks.co.uk, localblocks.co.uk` (up to 15 minutes).

**2. Deploy** (from the project folder, `main` up to date)

```bash
npm run cf:migrate
```

```bash
npm run cf:deploy
```

```bash
npm run cf:deploy:app
```

Then **Workers & Pages** → each of `siteblocks-app`, `siteblocks-api` and `siteblocks-sites` →
**Settings → Domains & Routes**: delete anything still naming `siteblocks.co.uk` (wrangler adds
the new ones; it may leave the old ones). Then:

```bash
npm run cf:deploy:redirect
```

Check: `https://localblocks.co.uk/` and `https://api.localblocks.co.uk/health` work, and
`https://siteblocks.co.uk/build/?src=fb` lands on `https://localblocks.co.uk/build/?src=fb`.

**3. Email: verify the domain in Resend** (before any test payment: until it's verified, emails
from `hello@localblocks.co.uk` are refused)

- Resend → **Domains** → **Add domain** → `localblocks.co.uk` (same region as before).
- Resend lists three records. Add each in Cloudflare DNS exactly as shown, **DNS only** (grey
  cloud): a `TXT` on `resend._domainkey` (DKIM), an `MX` on `send` (priority 10, a
  `feedback-smtp.<region>.amazonses.com` address) and a `TXT` on `send`
  (`v=spf1 include:amazonses.com ~all`). They sit on `send.` and `resend._domainkey.`, so the
  Email Routing `MX` and SPF on the bare domain stay exactly as they are: don't edit or merge
  those.
- **Verify** in Resend. If your API key is limited to siteblocks.co.uk, make a new one
  (Sending access, domain `localblocks.co.uk`) and store it:
  `npx wrangler secret put RESEND_API_KEY -c server/wrangler.api.jsonc`.

Emails now come from `Local Blocks <hello@localblocks.co.uk>` and replies land in your support
inbox through Email Routing.

**4. Stripe** (test mode now; check the same settings again when you activate live mode)

- **Developers → Webhooks** → the existing endpoint → **Update details**: endpoint URL
  `https://api.localblocks.co.uk/v1/stripe/webhook`. Same events; the signing secret doesn't
  change, so `STRIPE_WEBHOOK_SECRET` stays.
- **Settings → Business → Public details**: business name `Local Blocks`, website
  `https://localblocks.co.uk`, support email `hello@localblocks.co.uk`.
- **Settings → Business → Public details** (or **Payments → Statement descriptor**): statement
  descriptor `LOCALBLOCKS`.

**5. Cloudflare Access for the dashboard**: as in "Putting /admin behind Cloudflare Access"
below, on domain `localblocks.co.uk`, path `admin`. If you made one for siteblocks.co.uk, change
its hostname instead.

**6. Cloudflare Web Analytics (homepage only)**

- Cloudflare → **Analytics & Logs → Web Analytics → Add a site** → `localblocks.co.uk`. Choose
  the **manual JavaScript snippet**, not automatic setup (automatic would put it on customers'
  sites too). If it shows as automatic, switch it off under **Manage site**.
- Copy the token (32 letters and digits from the snippet's `"token"`) into `.env.production`
  as `VITE_CF_BEACON_TOKEN=…` (it's public, not a secret), then `npm run cf:deploy:app`. The build
  adds the beacon to the homepage only.

**7. Keep `siteblocks.co.uk` renewing** until October 2027, with its wildcard DNS record, so the
redirects keep working.

## Launch day

Until launch, nothing of ours is in search results: every page says noindex, `robots.txt`
disallows everything and there's no sitemap. One switch turns that around.

**1. Fill in the legal details** in `src/brand/config.ts` under `legal` (your name, business
address, ICO registration number, and the date for "Last updated"). The privacy policy and terms
show any that are still placeholders, highlighted; a build with `LAUNCHED` on refuses to finish
while one is left.

**2. Flip the switch.** In `server/wrangler.api.jsonc` set `"LAUNCHED": "true"` and `"NOINDEX":
"false"`, and in `server/wrangler.site.jsonc` set `"NOINDEX": "false"` (`npm test` fails if
the three disagree). Merge, then deploy all three:

```bash
npm run cf:deploy
```

```bash
npm run cf:deploy:app
```

The homepage build then serves `robots.txt` (open, but not `/build/` or `/admin/`) and
`sitemap.xml` (the homepage, privacy, terms and the hosting guide), and drops the noindex
header except on the builder and dashboard (`src/pages/seo.ts`). Customers' sites get their own
`robots.txt` and `sitemap.xml` when they're published; **sites published before launch keep
noindex until republished** (pressing Publish changes on each is enough).

Check: `https://localblocks.co.uk/robots.txt` shows `Sitemap: https://localblocks.co.uk/sitemap.xml`,
and `curl -I https://localblocks.co.uk/` shows no `X-Robots-Tag`.

**3. Google Search Console** (free; you'll need the Google account you want to manage it with)

1. Go to https://search.google.com/search-console and choose **Add property** (or the property
   menu, top left → **Add property**).
2. Choose **Domain** (the left box, not "URL prefix") and type `localblocks.co.uk`. **Continue**.
   A Domain property covers every address: `www.`, and every customer's `<name>.localblocks.co.uk`.
3. Google shows a TXT record starting `google-site-verification=`. Click **Copy**. Leave the page open.
4. In Cloudflare → **localblocks.co.uk** → **DNS** → **Records** → **Add record**: type **TXT**,
   name `@`, content: paste the whole value, TTL Auto → **Save**. Don't change the existing SPF
   TXT record (`v=spf1 …`): this is a second, separate TXT record.
5. Back in Search Console, click **Verify**. If it says it can't find the record, wait ten
   minutes and try again (it can take up to a day). Keep the TXT record for good: removing it
   un-verifies the property.
6. In the new property: **Sitemaps** (left menu) → enter `sitemap.xml` →
   **Submit**. It should say "Success" within a day or so.
7. Optional: **URL inspection** → `https://localblocks.co.uk/` → **Request indexing**, to get
   the homepage looked at sooner.

Customers' sites need nothing from you: they're covered by the Domain property, and each has
its own sitemap.

## Admin dashboard

`https://localblocks.co.uk/admin/` shows the funnel from landing on the homepage to paying, where
people drop off, which ad sent them, money in and out, recent sites and which layouts win. It's
for the owner only: the page sits behind **Cloudflare Access** (a one-time code to your email),
and the numbers come from `GET /v1/admin/stats`, which needs the admin key (`X-Admin-Key`,
the `ADMIN_TOKEN` secret). The page asks for the key once per browser tab.

### What's recorded (`server/core/events.ts`, table `events`)

| Step | Recorded by | When |
|---|---|---|
| `landed` | homepage | Page load. No id at all. |
| `started` | builder | Opened with no site to reopen (a new visitor). |
| `basics_done`, `look_picked` | builder | Leaving the Basics and Your look steps. |
| `build_done` | builder | Reaching Go live. |
| `preview_shared` | server | A preview link was made. |
| `checkout_started` | server | A Stripe Checkout was opened. |
| `paid`, `refunded`, `disputed` | server | The Stripe webhook (or the refund link) recorded it. |

Each row holds only: the step, the time, the trade, the theme, the ad source (`src`,
`campaign`) and the site's random id (`ref`) once the builder has one. Never names, emails,
phone numbers, IP addresses, browser details or the draft key. Builder steps are sent only in the
visit that started the site (once each), so a reload, a return visit or an edit link never counts
someone twice; the server's steps are stored once per site. Layout picks (`layout_picks`: section, layout id,
theme, trade, source) are recorded each time a layout is kept. Browsers driven by automation
(`navigator.webdriver`) send nothing.

The builder calls `POST /v1/events` fire-and-forget (`fetch` with `keepalive`, never awaited,
errors ignored); the server answers `204` at once and writes afterwards (`ctx.waitUntil`), so a
failed write never shows. Events are capped at 60 a minute per address by Workers rate limiting
(`EVENT_LIMIT` binding, counted in memory at the edge, nothing stored). Everything is deleted
after 13 months by the daily cron.

**Ad source**: ad links point at the homepage with `?src=fb` (or `utm_source`, plus
`utm_campaign`). The homepage adds it to every builder link (`/build/?src=fb`), the builder sends
it with a new draft (`POST /v1/drafts {src, campaign}`) and with each step, and the server keeps
it on the draft (`drafts.src`, `drafts.campaign`, set once when the draft is made), so every later
event of that site (checkout, payment, refund, dispute) carries it, whatever link it's opened from. Sources are kept to a list: `fb`, `ig`, `google`, `tiktok`, `leaflet`
(`facebook` and `instagram` count as `fb` and `ig`). Any other value is stored as `other`, and none
(or `direct`) as direct. Campaigns are cleaned to lower-case letters, digits, `-` and `_` (40
characters); anything with an `@` or a run of 7+ digits (a phone number) is dropped.

**Requested business types** (`server/core/requested.ts`, table `requested_types`, migration
0006): "My business isn't listed" on the builder's first step sends what the visitor typed
(`POST /v1/requested-types {text, closest}`). Only a short description is kept, cleaned by
`src/analytics/requested.ts` (lower case, letters and `& ' -`, 60 characters, six words);
anything that looks like an email, a phone number or a web address is dropped without a word.
Each row is the description, how many times it was asked for, the type we suggested and when it
was first and last asked: nothing about who asked (no draft key, no source, no IP). Same rate
limit as events. The dashboard lists the 50 most asked for, all time. A description not asked for
again in 13 months is deleted by the daily cron.

Money (sales, revenue, refunds, disputes, net) comes from the payments on `drafts`, not from
events. Full refunds and disputes count on the day they happened. Stripe's fee on each sale is
read from its balance transaction just after the payment (`drafts.stripe_fee`, migration 0005),
and the daily cron fills in any Stripe hadn't settled yet; the dashboard shows fees and net after
fees (Stripe keeps its fee on a refund).

### Try it locally

```bash
npm run dev:stack -- --sample-events
```

```bash
npm run dev:api
```

Then open `http://localhost:5173/admin/` and enter the local admin key the first command prints.
`--sample-events` fills an empty local database with 30 made-up days (`scripts/sample-events.ts`).

### Putting /admin behind Cloudflare Access (one-off, free)

1. Cloudflare dashboard → **Zero Trust**. The first time, choose a team name and the **Free**
   plan (up to 50 users).
2. **Settings → Authentication → Login methods**: check **One-time PIN** is listed (it is by
   default). Nothing else is needed.
3. **Access → Applications → Add an application → Self-hosted**.
   - Name: `Local Blocks dashboard`. Session duration: `24 hours`.
   - **Add public hostname**: domain `localblocks.co.uk`, path `admin`. This covers `/admin`
     and everything under it.
   - Identity providers: leave **One-time PIN** on; turn on **Instant Auth** if offered (skips the
     provider picker).
4. **Policies → Add a policy**: name `Owner`, action **Allow**, include rule **Emails** with your
   own email address. Save the policy, then save the application.
5. Check it in a private window: `https://localblocks.co.uk/admin/` should show Cloudflare's
   sign-in page; enter your email, type the code it sends, and the dashboard asks for the admin key.
   `https://localblocks.co.uk/` and `/build/` must still open without signing in.

No secret goes in the repo: Access lives in the Cloudflare dashboard, and `ADMIN_TOKEN` is a
wrangler secret (step 6 above).

### Deploying it

```bash
npm run cf:migrate
```

```bash
npm run cf:deploy
```

```bash
npm run cf:deploy:app
```

Migration `0004_events.sql` only adds tables and columns.

## Own domains (Cloudflare for SaaS)

A paid, live site can be shown at the customer's own domain, included in the £99. Each domain
is a Cloudflare **custom hostname** on the `localblocks.co.uk` zone; the customer adds two records,
a CNAME (`www` → `domains.localblocks.co.uk`) and Cloudflare's ownership TXT record
(`_cf-custom-hostname.www` → a code it gives us), Cloudflare checks them and issues the
certificate, and the site worker serves the site there. 100 custom hostnames are free, then $0.10 a month each; the
dashboard shows how many there are.

### How it works

- **Use your own domain** (`/build/#domain`, linked from the go-live step once paid and from the
  welcome email as `#domain=<edit token>`): the customer types their domain. The server checks it
  (`src/domains/domainName.ts`: a real public domain, not ours, punycode, length), looks up its
  nameservers (public DNS over HTTPS) to tell which domain company it's with and that it exists,
  refuses one another site has, and adds the custom hostname (`server/core/domains.ts`). One
  domain per site; `www.<domain>` by default, or the subdomain they typed.
- The page then shows only their company's steps (GoDaddy, IONOS, 123-reg, Fasthosts,
  Namecheap, Cloudflare, Squarespace; general steps for anyone else, `src/domains/providerSteps.ts`)
  with copy buttons, or **Connect automatically** where their company takes our Domain Connect
  template (`docs/domain-connect.md`). It checks again when they come back to the tab.
- **Bare domains**: most UK companies can't point the bare domain at us, so customers switch on
  their company's free forwarding to `www` (the steps and the email say how). When their DNS is on
  Cloudflare, the bare domain is connected too (a second custom hostname) and redirects to `www`.
- **Ownership**: nothing is served at a domain until we've seen its ownership TXT record in public
  DNS (a CNAME alone could be anyone's: pointing someone else's domain at us must not show your
  site there). It's checked on every refresh until seen, then kept.
- **Status** comes from Cloudflare only (plus that TXT record): "Waiting for your domain" until the hostname and its
  certificate are both active, then "Live". The page asks at most every 15 seconds; a cron every
  15 minutes checks waiting domains, and the daily one re-checks live ones. Going live republishes
  the site under the domain (canonical link, sitemap, Open Graph), makes `<slug>.localblocks.co.uk`
  301 to it (pages only: photos and fonts stay, for downloads; browsers keep that redirect an hour
  only, so a disconnected domain never strands anyone), and sends one email. A domain that
  stops pointing at us goes back to "waiting" and the free address. Waiting 30 days: given up.
- **Disconnect** (customer, or `POST /v1/admin/domains/disconnect {hostname}` with the admin key)
  removes the custom hostname and republishes on the free address.
- **Refunds, lost disputes and deleted test sites** remove the domain from Cloudflare at once;
  **an open dispute** pauses it (off Cloudflare, kept) and a won dispute puts it back. If
  Cloudflare can't be reached the domain is marked `removing` (never served) and the cron finishes
  the job; it also puts back paused domains whose site is live again. Every status change is
  conditional on the status it was read with, and a hostname re-made for a domain that changed
  meanwhile is removed again. Table `custom_domains`, migration `0007_custom_domains.sql` (adds a table only).

### One-off setup (in this order)

**1. Switch on Cloudflare for SaaS**

1. https://dash.cloudflare.com → **localblocks.co.uk** → **SSL/TLS** → **Custom Hostnames**.
2. If asked, **Enable Cloudflare for SaaS** (it needs a payment method on the account; the first
   100 hostnames are free).

**2. The fallback origin and CNAME target**

1. **DNS** → **Records** → **Add record**: type **AAAA**, name `domains`, IPv6 address `100::`,
   **Proxied** (orange cloud), TTL Auto → **Save**. (Like the wildcard record: nothing answers at
   `100::`, the workers do.)
2. Back in **SSL/TLS** → **Custom Hostnames** → **Fallback Origin**: type `domains.localblocks.co.uk`
   → **Add Fallback Origin**. Wait until it says **Active** (a few minutes; refresh the page).

**3. API token for custom hostnames**

1. Profile icon (top right) → **My Profile** → **API Tokens** → **Create Token** → **Custom token** → **Get started**.
2. Name: `Local Blocks custom hostnames`. **Permissions**: Zone · SSL and Certificates · Edit.
   **Zone Resources**: Include · Specific zone · `localblocks.co.uk`. Nothing else.
3. **Continue to summary** → **Create Token**. Copy it (shown once) and store it:

```bash
npx wrangler secret put CF_SAAS_TOKEN -c server/wrangler.api.jsonc
```

**4. The zone id** (not secret): **localblocks.co.uk** → **Overview**, right-hand column, **API** →
**Zone ID** → copy. Put it in `server/wrangler.api.jsonc` as `"CF_ZONE_ID": "<it>"` (commit it,
or send it to Claude).

**5. Deploy, in this order: migrate 0007 → API → sites → app**

First, check no site already has the address `domain` or `domains` (they're now reserved: `domains.`
is the CNAME target). It should print an empty list; if not, tell Claude before deploying:

```bash
npx wrangler d1 execute siteblocks --remote -c server/wrangler.api.jsonc --command "SELECT slug, ref FROM slugs WHERE slug IN ('domain', 'domains')"
```

Then the migration first. (The site worker copes without the new table, and a database failure
never takes a site down: the free address just serves as ever. But the API's own-domain
endpoints need it.)

```bash
npm run cf:migrate
```

```bash
npm run cf:deploy
```

```bash
npm run cf:deploy:app
```

(`cf:deploy` deploys the API worker, then the site worker, which adds the `*/*` route and the
database binding.) Then **Workers & Pages** → `siteblocks-sites` → **Settings → Domains & Routes**
should list `*.localblocks.co.uk/*` and `*/*`; `siteblocks-api` keeps `api.` and `preview.`
(more specific routes win), and `siteblocks-app` keeps its `localblocks.co.uk` custom domain
(custom domains win over routes). Check `https://localblocks.co.uk/`,
`https://api.localblocks.co.uk/health` and a site address still work.

**6. Try it** with a domain you own: open a paid test site's edit link → **Use your own domain**,
follow the steps, and wait for "Live" (or the email).

**One-click (optional, later)**: `docs/domain-connect.md` has the key, the template submission
and the emails to the domain companies.

## Payments and email (one-off, test mode)

Everything here is **test mode**. Live keys come with launch, not before.

### 1. Stripe

1. Stripe dashboard, **Test mode** on (top right). **Developers** → **API keys**: copy the
   **Secret key** (`sk_test_…`).
2. **Developers** → **Webhooks** → **Add endpoint**. URL `https://api.localblocks.co.uk/v1/stripe/webhook`.
   Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`. **Add endpoint**, then reveal and copy its **Signing secret** (`whsec_…`).
3. **Settings** → **Business** → **Public details**: the business name and support email people
   see on Stripe's page and their bank statement.

### 2. Resend (email)

1. Sign up at https://resend.com, **Domains** → **Add domain** → `localblocks.co.uk`, and add the DNS
   records it lists in Cloudflare (**DNS** → **Records**). Wait for **Verified**.
2. **API Keys** → **Create API key** (Sending access, that domain). Copy it (`re_…`).

### 3. Secrets

Paste each value when asked. Make the link secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

```bash
npx wrangler secret put STRIPE_SECRET_KEY -c server/wrangler.api.jsonc
```

```bash
npx wrangler secret put STRIPE_WEBHOOK_SECRET -c server/wrangler.api.jsonc
```

```bash
npx wrangler secret put LINK_SECRET -c server/wrangler.api.jsonc
```

```bash
npx wrangler secret put RESEND_API_KEY -c server/wrangler.api.jsonc
```

The tester code (any 8+ characters you'll give testers; make one the same way as the link secret):

```bash
npx wrangler secret put TESTER_CODE -c server/wrangler.api.jsonc
```

Then apply the new database migrations and deploy:

```bash
npm run cf:migrate
```

```bash
npm run cf:deploy
```
