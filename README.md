# Local Blocks

A pay-once website builder for tradespeople. Vite + React + TypeScript.

- `src/gen/`: the procedural section generator (framework-free: spec in, HTML out).
- `src/site/`: the site record (`schema.ts`, `parseSite`) and how the builder edits it.
- `src/publish/`: whole static pages from a saved record (meta tags, privacy notice, sitemap, address rules).
- `server/`: publishing on Cloudflare: checkout (Stripe), preview links, published sites, refunds. See [server/README.md](server/README.md), which also covers testing payments locally with the Stripe CLI and test cards.
- `src/home/`: the homepage (`/`). `src/builder/`: the builder (`/build/`): Basics → Your look → Build → Go live. On phones the Build step is one section at a time (`src/builder/phone/`): a slim bar to swipe its layouts, "Edit <section>" for just its fields under the live section, Done or Next to move on.
- `src/packs/`: one file per business type (`business/<id>.ts`): services, badges, sections, sample photos and its `/websites-for/` page copy. The builder, homepage chips and type pages read packs only. Adding a type: [docs/adding-a-business-type.md](docs/adding-a-business-type.md). `npm run pack:check` validates them (also part of `npm test`).
- `src/pages/`: our own static pages, built at build time with no framework: privacy, terms, the hosting guide and FAQ (from `content/*.md`), the `/websites-for/` hub and one page per pack with three examples rendered by the generator (`src/pages/types`, wired up in `vite.pages.ts`), and the 404 page. `npm run pack:images` makes the example screenshots, link-preview images and favicons into `public/`; `npm run page-shots -- /websites-for/plumbers/` saves phone and desktop screenshots.
- `src/brand/`: Local Blocks' own name, domain and email (`config.ts`, the one place they're set), tokens and logo, from [reference/design-handoff](reference/design-handoff/BRAND.md). Never used by customer sites.

- `src/admin/`: the private admin dashboard (`/admin/`, behind Cloudflare Access): the funnel, ad sources, money, recent sites, layout picks. `src/analytics/`: the funnel steps, ad-source tags and the fire-and-forget tracker. See [server/README.md](server/README.md#admin-dashboard).

## Privacy (for the privacy policy)

What the policy can say, and exactly why it's true:

- **No tracking cookies.** Local Blocks sets no cookies of its own: not on the homepage, not in the builder, not on customers' sites. Cloudflare, which hosts everything, may set a security cookie (such as `__cf_bm`) to tell people from bots; it isn't used for tracking or advertising. No ad pixels and no fonts from other servers. The homepage (only) uses Cloudflare Web Analytics for page counts: it sets no cookies and doesn't follow anyone across sites.
- **Anonymous counts only.** To see how many people get from the homepage to paying, we count steps: landed on the homepage, started the builder, finished the basics, picked a look, reached Go live, shared a preview, started a checkout, paid, refunded, disputed. And which layout was kept in each section.
- **No data sold or shared.** The counts stay in our own database (Cloudflare D1) and are only seen by us.

Exactly what each count stores (table `events`; layout picks in `layout_picks`):

| Stored | Example |
|---|---|
| The step | `basics_done` |
| The time | 2026-10-11 14:02 |
| The trade and theme chosen, if chosen yet | `plumber`, `workwear` |
| The ad or link that sent the visitor, if any | one of `fb`, `ig`, `google`, `tiktok`, `leaflet` or `other`, and a campaign like `oct-test` (from `?src=` / `utm_source` / `utm_campaign`) |
| The site's random id, once there is one | `3f9c…` (32 random characters, not linked to a person until they pay) |

Never stored with a count: names, email addresses, phone numbers, IP addresses, browser or device details, or anything typed into the builder, with one exception: under "My business isn't listed" on the first step, the few words someone types to say what their business is ("dog groomer") are counted, cleaned and with nothing about who typed them, so we know which business types to add next (table `requested_types`; anything like an email, phone number or web address is dropped). A homepage visit is counted with no id at all. Counts are deleted after 13 months.

What the browser keeps (strictly necessary, not tracking): the builder saves the site you're building, and its draft key, in your browser's local storage so you don't lose your work; a tester code (before launch) lasts only for the tab. Nothing new is stored for counting. Rate limits briefly count requests per IP address in memory or for at most a day, to stop abuse; they're not linked to the counts. Paying customers' email addresses are kept with their payment (for receipts, edit links and refunds), as before.

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run e2e
```

The builder stress test (in CI: 5 seeds on every pull request, the full 50 nightly and after each merge to main, `.github/workflows/stress.yml`): every trade, theme, content shape and 50 seeds, each section generated in real Chrome exactly as the builder does it. Every section must offer at least three layouts that pass every hard check (fit, contrast, no lone grid items, no gaps, no overlapping text, nothing spilling out).

```bash
npm run stress
```

A broken case from the builder: in a dev build press Alt+Shift+D ("Copy debug info"), paste it into a file, then reproduce it in real Chrome, with every candidate layout and the checks it failed:

```bash
npm run repro -- debug.json
```

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
