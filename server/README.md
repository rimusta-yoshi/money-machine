# Publishing server (Phases 1 and 2)

Two Cloudflare Workers, one D1 database, one R2 bucket, Stripe Checkout and an email sender.
Paying is what publishes a site: the Stripe webhook puts it live. The admin key still publishes
without paying, for testing and support only (the public builder never shows it).

| Host | Worker | What it does |
|---|---|---|
| `api.siteblocks.co.uk` | `siteblocks-api` | The builder's API: photo uploads, preview links, address checks, checkout, the Stripe webhook, edit links, refunds, re-publishing. Also serves the builder's sample photos (`/samples/<file>`). |
| `preview.siteblocks.co.uk` | `siteblocks-api` | Preview links (`/<token>/`), rendered live from the latest save, plus draft photos. Always noindex. |
| `<slug>.siteblocks.co.uk` | `siteblocks-sites` | Published sites: static files straight from R2. Never renders, no database. `www.` redirects to the homepage. |
| `siteblocks.co.uk` | `siteblocks-app` | The homepage and builder (`npm run build` output), static files only. Deploy with `npm run cf:deploy:app`; settings in `.env.production`. |

```
builder ──POST photos────▶ API worker ──bytes──────▶ R2 drafts/<ref>/photos/<hash>.webp
        ──PUT /v1/draft──▶            ──parseSite──▶ D1 (only before a preview link or a checkout)
        ──checkout───────▶            ──Stripe─────▶ Checkout Session (£99 from config) ──▶ customer pays on Stripe
Stripe  ──webhook────────▶            ──src/gen────▶ R2 sites/<slug>/… ; D1 payment ; welcome email
visitor ──<slug>.siteblocks.co.uk──▶ site worker ──▶ R2 sites/<slug>/…   (+ /fonts from the deployed assets)
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
`<slug>.siteblocks.localhost` over HTTPS and runs axe (with colour contrast) on the published
pages and preview links, desktop and phone, every theme. Screenshots go to `e2e/screens/`.

## Try it locally

```bash
npm run dev:stack
```

```bash
npm run dev:api
```

The first runs both workers on `https://*.siteblocks.localhost:8787` (self-signed: open
`https://api.siteblocks.localhost:8787/health` once and accept the warning, and the same for
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
   stripe listen --forward-to https://127.0.0.1:8787/v1/stripe/webhook --skip-verify
   ```

   (`127.0.0.1`, not the `.localhost` name: the CLI can't resolve it; `--skip-verify` accepts the
   local self-signed certificate.)
4. `npm run dev:stack` and `npm run dev:api`, build a site, and press **Go live for £99** (leave the
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
   `siteblocks.co.uk`.
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
4. The 8 sample photos (see `reference/sample-photos/LICENCE.md`) are uploaded in step 6 by a script.

### 4. Wildcard DNS record

1. Dashboard → **siteblocks.co.uk** → **DNS** → **Records** → **Add record**.
2. Type **AAAA**, Name `*`, IPv6 address `100::`, Proxy status **Proxied** (orange cloud), TTL Auto → **Save**.

   `100::` is a "nowhere" address: every subdomain goes to Cloudflare, and the workers answer.
3. **SSL/TLS** → **Edge Certificates**: the Universal certificate should list
   `*.siteblocks.co.uk, siteblocks.co.uk` (can take 15 minutes after the first wildcard record).

Worker routes need no clicks: `wrangler deploy` creates them from the configs
(`api.` and `preview.` → `siteblocks-api`, `*.siteblocks.co.uk/*` → `siteblocks-sites`; the
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
VITE_API_URL=https://api.siteblocks.co.uk
VITE_SAMPLE_PHOTOS_URL=https://api.siteblocks.co.uk/samples
```

Then `npm run dev`, build a site, and on the go-live step use **Get a preview link** (open it on
your phone), then **Go live for £99** (a test card, once the payment secrets below are set) or,
on a dev build, fill in the admin key to publish without paying. It goes live at
`https://<address>.siteblocks.co.uk`.

Check: https://api.siteblocks.co.uk/health answers `{"ok":true}`.

## Settings

| Variable | Where | Meaning |
|---|---|---|
| `BASE_DOMAIN` | both configs | `siteblocks.co.uk`. Change here and in the route patterns to move domain. |
| `BUILDER_ORIGINS` | API config | Comma-separated origins allowed to call the API (default `http://localhost:5173`). Add the builder's address when it's hosted. |
| `NOINDEX` | both configs | `true` until launch: noindex headers and meta tags, robots.txt disallows everything. |
| `PREVIEW_DAYS` | API config | How long preview links work (30). |
| `BRAND_NAME` | API config | The product's name in emails and on Stripe's page (changes with the rename). |
| `APP_URL` | API config | Where the homepage and builder live: Stripe's return pages and the links in emails. |
| `PRICE_PENCE` | API config | The one price, in pence (`9900`). The only place it's set: the builder asks the server (`GET /v1/config`), and the homepage and builder are built with it. |
| `LAUNCHED` | API config | `false` until launch: checkouts need the tester code. `true` takes orders from everyone. |
| `REFUND_DAYS` | API config | How long the self-serve refund link works after paying (`14`). |
| `EMAIL_FROM`, `SUPPORT_EMAIL` | API config | Sender of every email, and the address replies and "get in touch" go to. |
| `ADMIN_TOKEN` | API secret | Publishing without paying, for testing and support. Unset: closed. |
| `STRIPE_SECRET_KEY` | API secret | `sk_test_…`. Unset: checkout says payments aren't open. A live key (`sk_live_…`) is refused unless `STRIPE_ALLOW_LIVE=true`. |
| `STRIPE_WEBHOOK_SECRET` | API secret | `whsec_…`, from the webhook endpoint in the Stripe dashboard. |
| `LINK_SECRET` | API secret | Signs edit and refund links (32+ characters). Needed when payments are on. |
| `TESTER_CODE` | API secret | Lets testers check out before launch (8+ characters). Unset: nobody can until `LAUNCHED` is `true`. |
| `RESEND_API_KEY` | API secret | Sends email through Resend. Unset: emails are written to the worker's log instead (fine for testing, not for customers: the log then holds their links). |

A daily cron (03:17 UTC) clears expired preview links, address holds and rate-limit counters,
then runs the cleanup above.

## Payments and email (one-off, test mode)

Everything here is **test mode**. Live keys come with launch, not before.

### 1. Stripe

1. Stripe dashboard, **Test mode** on (top right). **Developers** → **API keys**: copy the
   **Secret key** (`sk_test_…`).
2. **Developers** → **Webhooks** → **Add endpoint**. URL `https://api.siteblocks.co.uk/v1/stripe/webhook`.
   Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`. **Add endpoint**, then reveal and copy its **Signing secret** (`whsec_…`).
3. **Settings** → **Business** → **Public details**: the business name and support email people
   see on Stripe's page and their bank statement.

### 2. Resend (email)

1. Sign up at https://resend.com, **Domains** → **Add domain** → `siteblocks.co.uk`, and add the DNS
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
