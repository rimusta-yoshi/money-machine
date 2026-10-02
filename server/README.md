# Publishing server (Phase 1)

Two Cloudflare Workers, one D1 database, one R2 bucket. No payment yet: publishing needs an
admin key until Phase 2.

| Host | Worker | What it does |
|---|---|---|
| `api.siteblocks.co.uk` | `siteblocks-api` | The builder's API: drafts, photo uploads, preview links, address checks, publishing. Also serves the builder's sample photos (`/samples/<file>`). |
| `preview.siteblocks.co.uk` | `siteblocks-api` | Preview links (`/<token>/`), rendered live from the latest save, plus draft photos. Always noindex. |
| `<slug>.siteblocks.co.uk` | `siteblocks-sites` | Published sites: static files straight from R2. Never renders, no database. |

```
builder ──PUT /v1/draft──▶ API worker ──parseSite──▶ D1 (drafts, previews, slugs, rate limits)
        ──POST photos────▶            ──bytes──────▶ R2 drafts/<ref>/photos/<hash>.webp
        ──publish────────▶            ──src/gen────▶ R2 sites/<slug>/index.html, privacy.html, site-<hash>.css, photos/…
visitor ──<slug>.siteblocks.co.uk──▶ site worker ──▶ R2 sites/<slug>/…   (+ /fonts from the deployed assets)
```

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

## Tests

```bash
npm test
```

Runs everything, including `server/test/api.test.ts`: both workers under Miniflare (the
Workers runtime) with local D1 and R2.

```bash
npm run e2e
```

Real Chrome: builds a site in the actual builder, saves, makes a preview link, publishes, then
visits `<slug>.siteblocks.localhost` over HTTPS and runs axe (with colour contrast) on the
published pages and preview links, desktop and phone, every theme. Screenshots go to `e2e/screens/`.

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
your phone), then **Publish my site** with the admin key. It goes live at
`https://<address>.siteblocks.co.uk`.

Check: https://api.siteblocks.co.uk/health answers `{"ok":true}`.

## Settings

| Variable | Where | Meaning |
|---|---|---|
| `BASE_DOMAIN` | both configs | `siteblocks.co.uk`. Change here and in the route patterns to move domain. |
| `BUILDER_ORIGINS` | API config | Comma-separated origins allowed to call the API (default `http://localhost:5173`). Add the builder's address when it's hosted. |
| `NOINDEX` | both configs | `true` until launch: noindex headers and meta tags, robots.txt disallows everything. |
| `PREVIEW_DAYS` | API config | How long preview links work (30). |
| `ADMIN_TOKEN` | API secret | Publishing key until Phase 2. Unset: publishing is closed. |

A daily cron (03:17 UTC) clears expired preview links and old rate-limit counters.
