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

Edit, refund and resume links are HMAC-signed with `LINK_SECRET` (rotating it invalidates every link).
Paid sites stay `noindex` while `NOINDEX` is `true`; unpaid sites published with the admin key
are always `noindex`.

### Drafts and cleanup

The builder autosaves in the browser only. The server holds a copy of the record just for
preview links and checkouts (photos are uploaded as they're added, so the record kept in the
browser stays small). The daily cron (03:17 UTC) deletes unpaid, never-published drafts not used
for 30 days, with their photos, and photos left behind by drafts that no longer exist. Paid sites
(refunded ones too) and published sites are never deleted automatically. A resume link's email
address and reminder (below) live on the draft's own row, so they go with it.

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

### Finish on your computer (resume links)

On a phone the builder offers "Email me a link to finish on my computer", with an optional
"remind me". The builder first sends the record (`PUT /v1/draft`), then:

- `POST /v1/draft/resume-link {email, remind}` (draft key) → `200 {ok: true, message: "We've sent a link to <email>."}`.
  Unpaid sites only (`409 already_paid`), saved first (`409 not_saved`), a valid email up to 254
  characters (`422 invalid_email`). Limits: 10 an hour per caller address (`429 rate_limited`),
  3 per site in 24 hours and 3 a day to any one email address, whichever sites they're for
  (`429 too_many_links`; the address is counted as a sha256 of it, lower-cased, in `rate_limits`
  for the day), and 500 a day in all, past which nothing is sent until tomorrow (`429
  sending_paused`, logged). Emails `/build/#resume=resume.<ref>.<n>.<sent>.<signature>` ("Finish
  your website on your computer"): `n` is the site's link number (`drafts.resume_n`), `sent` the
  sending time in seconds, both signed. The email has nothing the customer typed in it (not even
  the business name), so the form can't send anyone words of someone else's choosing. Stores
  `resume_email` and, if "remind me" was ticked, `resume_remind_at` = now + 3 days.
- `POST /v1/draft/resume {token, key?}` (no auth header: the token is the authority) → `200 {key}`.
  A link works **once**, for **7 days**, and only while it's the site's newest: sending a new one,
  the reminder, or opening one moves `resume_n` on, so every older link stops working. Opening
  one gives this device a new draft key, stored as `drafts.alt_key_hash`. The key it replaces (an
  earlier resume link's) goes to `prev_alt_key_hash`, which opens nothing but lets that device be
  told `401 key_replaced` ("This site was opened on another device. Open the newest link from your
  email to carry on here.") instead of `401 unknown_draft`; the builder then shows that notice and
  keeps the site, photos and all. If the browser sends the key it already holds (`key`) and that
  key opens the same site, the same key comes back and the link is left unused. The phone's own
  key always keeps working. A wrong, used, replaced or expired link: `401 unknown_link`; a paid or
  refunded site: `409 already_paid`. 30 an hour per caller address. The builder treats `#resume=`
  like an edit link: it asks first if this browser holds a different site.
- **Paying**: whichever key starts the checkout becomes the main key (`promoteKey`), so the device
  that pays keeps editing; once the payment is recorded the second key stops working (moved to
  `prev_alt_key_hash`: that device is told "This site is live now: open the edit link from your
  email"), and `resume_email` / `resume_remind_at` are cleared. Publishing with the admin key
  clears those two as well.
- **The reminder**: the daily cron sends one "Your website is waiting" email (a fresh link, same
  rules) to drafts whose `resume_remind_at` has passed, still unpaid, unpublished and not
  refunded, 50 a run. `resume_reminded_at` is set before sending, so there is never a second one,
  even if they ask for the link and tick "remind me" again.

Code: `server/core/resume.ts`, `server/cloudflare/d1Resume.ts`; migration
`0008_resume_and_review.sql` (adds columns and indexes only).

### Review flag

`server/core/reviewWords.ts` lists words worth a person's look (bank, banking, login, log in,
sign in, verify your account, password, passcode, crypto, bitcoin, wallet, seed phrase, pin
number, account suspended). They're matched case-insensitively as whole words in every bit of
customer-written text a visitor sees (business name, about, location, headline, services,
badges, why-us lines, certificates note, areas, hours, jobs done, reviews and photo
descriptions); "embankment" or "Banksy" don't count, and "Bank holidays" in opening hours is let
through. When a preview link is made, at checkout, when the paid webhook publishes, on a paid
re-publish and on an admin-key publish, the words found are stored on the draft (`review_words`,
`review_flagged_at`). It never blocks anything, never changes what the customer sees, and a
failure to record it is only logged. Unchanged text and word lists (`review_fp`, a hash of both)
aren't flagged again; changed text with listed words, or a changed list, flags it again, even
after it was marked reviewed.

The dashboard's **Sites to review** panel lists them: `GET /v1/admin/review` (admin key) →
`{sites: [{ref, slug, name, words, flaggedAt, paid, refunded, published, takenDown, url}]}`, newest first,
the latest 100 not yet reviewed. `published` is from `published_at`; `url` is set only while the
site is live (published, not refunded, no dispute, not taken down). **Mark reviewed** is
`POST /v1/admin/review/clear {ref}` (admin key) → `{ok: true}` (`404 not_flagged` if it isn't on
the list).

### Take down and restore (abuse)

`server/core/takedown.ts`, migration `0009_takedown.sql`. Pulls a harmful site (phishing, scams,
illegal content) at once **without refunding it**, and puts it back exactly if it was a mistake.
Admin key only, rate limited like the other admin calls, never refused after launch (unlike the
test-site delete). Nothing is deleted and no email is sent.

| Call | Body | Answer |
|---|---|---|
| `GET /v1/admin/sites/lookup` | `?address=…` or `?ref=…` | `{site}`: address, own domain, owner's email, paid/refunded/disputed, `takenDown`, and `takedown` (latest reason, who and when, restore, and the full `log`) |
| `POST /v1/admin/sites/takedown` | `{ref \| address, reason (3–500 chars), by?}` | `{site, domainPaused}`; `409 already_taken_down` |
| `POST /v1/admin/sites/restore` | `{ref \| address, by?}` | `{site, domainResumed, stillDown}`; `409 not_taken_down` |

`address` is the free `<slug>.localblocks.co.uk` (or just the slug), or the customer's own domain,
bare or www (a pasted URL is fine). Exactly one of `ref` and `address`; `422` otherwise.

While a site is taken down (`drafts.taken_down_at` set):

- **Every request** to its free address (pages, photos, fonts) and to its own domain answers
  `410 Gone` "This site isn't available", `noindex`, `no-store`. 410 rather than 451: 451 is for a
  block a legal authority demands, while our take-downs are under our own terms, and 410 gets
  search engines and safe-browsing lists to drop the pages fastest. The site worker reads this from
  the database (remembered `HOST_CACHE_SECONDS`, 60 s); if the database can't be read it serves as
  ever, like the own-domain lookups. The published files stay in R2 untouched.
- **Its own domain is paused** (`pauseDomain`, off Cloudflare, kept), as a dispute pauses it; if
  Cloudflare can't be reached the cron pauses it (the "disputed" sweep now includes taken-down
  sites), and meanwhile any request that reaches us gets the 410 page. The cron never resumes a
  taken-down site's domain.
- **The owner** can't save, upload, preview, publish, download, use the domain page or send resume
  links (`403 taken_down`, from `authDraft`); `GET /v1/draft` answers `{takenDown: true, record:
  null, support}`, and the builder shows "Your site has been taken down" instead of the editor. The
  self-serve refund link answers `taken_down` (no refund: a person decides). Preview links show the
  410 page. The daily cleanup never deletes a taken-down draft (kept as evidence).

**Restore** clears `taken_down_at` (the reason, who and when stay, and `takedown_log` keeps every
take-down and restore) and resumes the own domain (pending until Cloudflare checks it again, as
after a won dispute; served meanwhile). It only undoes the take-down: a site refunded, or with a
dispute open or lost, stays down (`stillDown: true`), and its domain stays off. A dispute won while
a site is taken down puts its files back but keeps it hidden, domain paused, until it's restored.

From the command line: `npm run site -- show|takedown|restore <address|ref> ["<reason>"]`
(`scripts/site.mjs`, same admin key and `--api` as `npm run test-sites`). On the dashboard: **Find
a site** (by address) and **Sites to review** both have Take down (asks why, then confirms) and
Restore.

### Privacy (draft line for legal check)

> If you ask us to email you a link to finish your website on another device, we keep the email
> address you give with your unfinished site, to send that link and, only if you tick "remind
> me", one reminder three days later. We don't use it for anything else or share it. It's deleted
> together with your unfinished site once nobody has worked on it for 30 days, or as soon as your
> site goes live. If you didn't ask for the link, you can ignore the email.

Not on the live privacy page until checked. How it's done: `resume_email` sits on the draft's row
(deleted by the 30-day cleanup) and is set to null when the payment is recorded (`markPaid`) or
the site is published (`markPublished`). To limit sending, a sha256 of the address is kept in
`rate_limits` for the day (swept after a day). Resend keeps its own log of sent emails for its
retention period.

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
since), then runs the cleanup above and sends the resume-link reminders that are due. Half an
hour earlier (02:47 UTC) another cron makes the nightly backup (see "Backups and restore").

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

## Backups and restore

Written for Claude to follow. rob's plain-English version: `docs/pm/backups.md`.

### What's protected

| What | How | Kept |
|---|---|---|
| The database (D1 `siteblocks`), every table | **Time Travel**, built into D1, always on: put the whole database back to any minute | 30 days on Workers Paid (7 on Free) |
| The database, every table but `rate_limits` | **Daily export** at 02:47 UTC by the API worker into the `siteblocks-backups-weur` bucket, `db/daily/<id>/` | 30 days (the newest is always kept, even if backups stop) |
| Paid and published sites' rows only, plus the anonymous dashboard tables | **Monthly export**, the first night of each month, `db/monthly/<YYYY-MM>/` | 12 months |
| Published sites (`sites/<slug>/…`) and the photos of paid or published sites (`drafts/<ref>/photos/…`) | **Nightly copy** of new or rewritten files into `files/<key>` | as long as the original exists |
| Those files' earlier versions, and files deleted from the live bucket | moved to `trash/<key>~<ms when moved>` | 30 days |

Not backed up: the builder's sample photos (`samples/`, put back by `npm run cf:samples`), the
"no longer available" markers (`gone/`, tiny, rewritten by a refund), unfinished sites' photos
(nobody has paid; the builder asks for them again), and `rate_limits` (hourly counters).
No secrets are in the database (only hashes of keys and links), so none are in the backups.

### Why this design

- **R2 has no object versioning** (it isn't in R2's S3 API list; lifecycle rules can only expire
  or move objects), so files are copied into a second bucket by the worker.
- **D1 Time Travel** is the quickest undo for a bad deploy or bad cleanup in the last 30 days,
  but only for the whole database at once, and not beyond 30 days. The **exports** add a longer
  history and let one site's rows be put back without touching anyone else's.
- The worker writes the export itself with ordinary queries (JSON per table, gzipped): no
  Cloudflare API token as a secret (Cloudflare's own D1-to-R2 example needs one), no Workflows.
- Everything stays in the same Cloudflare account. That protects against our mistakes and bugs,
  not against losing the account itself (a later step could copy the backup bucket elsewhere).

### How it runs (`server/core/backup/`, `server/cloudflare/backupStore.ts`)

- Cron `47 2 * * *` (`nightlyBackup`): the daily export, the monthly one if this month has
  none, as much of the files as the budget allows, then deleting expired backups
  (`retention.ts`). Half an hour before the 03:17 cleanup, so anything the cleanup deletes by
  mistake was copied minutes earlier.
- **Files, a budget at a time** (`files.ts`): the live keys and their copies are walked side by
  side in key order, 100 live keys a page. Each copy notes when the bytes it holds were written
  (`src_uploaded`, from the read itself) and which site they belonged to (`site_ref`); a file is
  copied again when its live write time differs. A copy whose original is gone, or about to be
  replaced, moves to `trash/`. A run stops after about 700 storage and database calls in all
  (what the exports used comes off that; 250 for the catch-up), checked file by file, well under
  the Worker limits (1,000 per run on Workers Free, 10,000 on Paid), and saves where it got to in
  `state/status.json` after every page. The quarter-hourly cron (`*/15`) carries an unfinished
  pass on, so a large first backup finishes over a few hours. Files are read whole (photos are at
  most 2 MB).
- **One run at a time**: a run walking the files holds a 15-minute lease (`busyUntil`); any other
  run (the catch-up, `npm run backup -- run`) skips the files meanwhile.
- **Mass-delete guard**: a pass that would move more than a quarter of the copies it has seen to
  the trash (past the first 100) stops and says so on the dashboard: a wrong bucket binding or an
  emptied database must not empty the backups. If the deletes were meant (say, test sites cleared
  before launch): `npm run backup -- run --allow-deletes`.
- **The export** (`dbExport.ts`): 50 rows per query in rowid order, part files of about 4 MB
  (`<table>.0001.json.gz`: `{table, columns, rows}`), then `manifest.json` last (schema, tables,
  row counts, part keys). An export without a manifest never counts and is deleted after a day.
  A new table must be added to `MONTHLY` in `dbExport.ts` (a test fails otherwise): decide
  whether its rows belong in the 12-month backups.
- **Health** (`status.ts`): healthy when the last good export is under 36 hours old, the last
  export didn't fail, and the files were last gone through all the way under 48 hours ago. The
  dashboard shows "Last backup: <time> ✓/✗" under its heading.
- Every step catches its own failure (logged, and on the dashboard); a failed backup never stops
  the cleanup or the domains cron.

Admin endpoints (admin key; `npm run backup` calls them, so it needs no Cloudflare login):
`GET /v1/admin/backups` (health, status, exports), `GET /v1/admin/backups/file?key=db/…` (one
export file as stored), `POST /v1/admin/backups/run` (`{}` back up now, `{"files": true}` only
carry the files on), `POST /v1/admin/backups/restore-files` (`{slug | ref, at?, dryRun}`).
503 `backups_off` if the bucket isn't bound.

### Checking

```bash
npm run backup -- verify
```

Says ✓ or ✗ (exit code 1): backups healthy, and the newest export downloads, every part parses
and the row counts match the manifest. `npm run backup -- list` shows the exports. Run verify
after every deploy that touches the server, and if the dashboard shows ✗.

The admin key comes from `ADMIN_KEY` or `admin-key.local` (as for `npm run test-sites`).
`--api https://api.localblocks.localhost:8787` points any command at the local dev stack.

### Restoring (pick the case)

Always: write down what went wrong and when (UTC), and don't deploy anything until it's back.
Nothing live changes without `--yes`; without it, each command says what it would do.

**A. A bad deploy, migration or cleanup damaged the database in the last 30 days.** Time Travel
puts the whole database back to a moment; everything written since is lost (payments too: check
the Stripe dashboard afterwards and resend missed webhooks with `stripe events resend evt_…`).

```bash
npm run backup -- time-travel --at 2026-10-16T09:30:00Z
```

```bash
npm run backup -- time-travel --at 2026-10-16T09:30:00Z --yes
```

The second prints the bookmark of the database as it was just before; to undo the restore:
`npx wrangler d1 time-travel restore siteblocks --bookmark=<that bookmark> -c server/wrangler.api.jsonc`.
Needs `CLOUDFLARE_API_TOKEN` (setup step 1, with D1 Edit).

**B. One customer's site was deleted or damaged** (rows, files or both). Put back only that
site; nobody else's data changes. Use the export from before it went wrong (`--from` a date
picks that day's newest export; `list` shows ids).

```bash
npm run backup -- restore-db --from 2026-10-15 --site joes-plumbing --to-local
```

This finds the site's id in the backup (it may be gone from the live database), writes just its
rows into the local dev database (stop `npm run dev:stack` first) and leaves the SQL in
`.wrangler/backups/`: read it to check these are the right rows. The SQL deletes that site's
current rows and inserts the backed-up ones with plain INSERTs, so it never deletes another
site. Before a production import the command checks the live database: if another site has
taken the address or domain since, it stops with nothing changed (tell rob: the address is no
longer this customer's). It also refuses a backup that doesn't have the site. Then:

```bash
npm run backup -- restore-db --from 2026-10-15 --site joes-plumbing --to-production --yes
```

```bash
npm run backup -- restore-files --site joes-plumbing
```

```bash
npm run backup -- restore-files --site joes-plumbing --yes
```

The production import prints the Time Travel bookmark first (the undo), then counts the site's
rows afterwards and says ✓ if they match the backup, or ✗ with the undo command.

`restore-files` puts back the newest backed-up copy of each of the site's pages and photos
(deleted ones too), or with `--from 2026-10-15` (end of that day, UTC) or `--from <ISO time>`
the files as they were then. An address is looked up in the live database, so put the rows back
first; only copies made while the files belonged to that site are used, so an address that has
gone to someone else never gets the old pages. It only writes files, never deletes any. Then
check the site, and re-publish it from the edit link if its pages should match the restored
record.

**C. The database is lost or damaged beyond 30 days, or Time Travel can't help.** Check the
export locally first (this replaces the local dev database):

```bash
npm run backup -- restore-db --from 2026-09-01 --to-local
```

then put every row of the live database back to it (the schema and `d1_migrations` stay;
Time Travel can undo this import for 30 days):

```bash
npm run backup -- restore-db --from 2026-09-01 --to-production --yes
```

If the database itself was deleted: create a new D1 database, put its id in
`server/wrangler.api.jsonc` and `wrangler.site.jsonc`, `npm run cf:migrate`, deploy, then the
command above. The SQL is also left in `.wrangler/backups/` for `wrangler d1 execute`.

**D. Files are missing from many sites** (the live bucket was emptied, or a bug deleted files).
Run `restore-files --ref <ref> --yes` for each site `npm run test-sites` lists (it lists every
paid or published site; it only refuses deleting after launch). A deploy fix must come first.
The mass-delete guard stops the nightly pass from moving most copies to the trash meanwhile;
copies it did move stay there 30 days, and `restore-files` finds them there too.

After any restore: `npm run backup -- verify`, open the affected sites, and note what happened
in `docs/pm/pm-status.md`.

### Privacy and retention

Backups hold the same personal data as the database: payment emails, site records (business
names, phone numbers, addresses, photos) and, for unfinished sites, the "finish on your computer"
email. So deleted data lives on in backups for a while:

- Unfinished sites (deleted after 30 days unused) stay in daily exports up to 30 days more.
- Paid and published sites stay in monthly exports up to 12 months after they're deleted.
- Deleted photos and pages stay in `trash/` 30 days.
- One exception: if backups stop altogether, the newest daily export is kept until they work
  again (so there's always one to go back to). The dashboard shows ✗ long before that matters.

Expired backups are deleted for good by the nightly run. If a customer asks for their data to be
erased, delete their site as usual; their data then leaves the backups on the schedule above
(say so in the reply). Draft privacy line for legal check (not on the live page yet):

> We keep backups so we can recover your website if something goes wrong. Backups are copies of
> the same information described above. Daily backups are kept for 30 days and a monthly backup
> of live and paid-for websites for 12 months; after that they're deleted for good. If you ask us
> to delete your information, it is removed from our live systems straight away and from our
> backups when they expire.

### One-off setup (before the deploy that brings this)

1. Create the bucket: dashboard → **R2 Object Storage** → **Create bucket** → name
   `siteblocks-backups-weur`, Location **Western Europe (WEUR)**, same as the main bucket (an Automatic placement put it in North America), Standard storage, **Create**. Leave public access
   off, no CORS. (Or `npx wrangler r2 bucket create siteblocks-backups-weur --location weur`.) The deploy fails
   until it exists: the API worker binds it as `BACKUPS`.
2. `npm run cf:deploy` (the binding and the new 02:47 cron come with it). No migration, no
   secret.
3. `npm run backup -- run`, then `npm run backup -- verify` until it says OK (a big first pass of
   the files finishes over the next few quarter-hours).
4. Workers Paid (planned for launch) gives Time Travel 30 days instead of 7 and the CPU the
   export needs as the database grows (Workers Free allows a cron 10 ms of CPU).

Cost: R2 storage is $0.015 per GB-month after the free 10 GB; the copies roughly double the
photos and sites, plus a few MB of exports a day.

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
(more specific routes win), and `siteblocks-app` keeps its `localblocks.co.uk` custom domain plus a
`localblocks.co.uk/*` route. Routes run *before* custom domains, so without that route `*/*` takes
the homepage (it did on 15 Oct 2026). The first time, deploy the app before the site worker. Check `https://localblocks.co.uk/`,
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
