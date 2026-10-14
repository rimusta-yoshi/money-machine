# Brief: business-type packs + "Websites for…" pages

Start from main (after the legal/download PR is merged, or rebase onto it). New branch, PR when done, merge when CI is green, then deploy. Test mode, tester gate and noindex stay as they are.

## Why
After launch we'll add business types fast: about 30 simple trades in month one, then combined trades and other local businesses (80–100 types in year one). Adding a type must be a content job (one file + photos), never a code job. Each type also gets its own page so SEO can start compounding early.

## 1. Packs (one file per business type)
- Audit how trades work today (trade list, services, sections per trade, sample photos, default copy, theme leanings) and consolidate everything about a type into one pack file, e.g. `src/packs/plumber.ts` (or JSON), with a typed schema and validation.
- A pack holds at least: id, display name, plural, synonyms people use ("sparky"), category (trade / home service / creative…), services list with short descriptions, default copy for each section, which sections it gets and their order (required / optional), trade-specific sections or badges (e.g. Gas Safe, NICEIC), sample photo set with licence info, colour/theme leanings, and the landing-page content (below).
- The builder reads packs only. Generator output for existing trades must not change (the stress test and existing tests stay green).
- `npm run pack:check`: validates every pack (required fields, photos exist and are licensed, no missing copy), and flags near-duplicate wording between packs (simple text-similarity check), because Google punishes pages that only swap a word.
- `docs/adding-a-business-type.md` + a pack template: step by step for adding type #31, written so a future chat can follow it without context.
- Sections are a shared library; packs only pick from it. A pack may name a section type that isn't built yet (e.g. "menu", "price-list", "opening-hours", "booking-button", "portfolio", "events"): pack:check then reports it as "blocked on section X" instead of failing silently, so we can see which new sections unlock the most packs.
- Leave room in the schema (don't build yet) for: combined trades ("I also do…" merging services/sections from other packs) and a generic "build from scratch" pack.

## 2. "Websites for <type>" pages
- One page per pack at `/websites-for/<id>` (e.g. /websites-for/plumbers), plus a hub at `/websites-for/` listing every type by category.
- Content comes from the pack, and each page must have genuinely specific substance:
  - a headline and intro written for that trade
  - 3 example sites for that trade rendered by our real generator at build time (different themes, fixed seeds, sample photos), shown as screenshots or live mini previews
  - "What a <trade> website needs": a short checklist specific to that trade (e.g. Gas Safe number, emergency call-outs, areas covered)
  - services we pre-fill, and the sections they get
  - 4–6 trade-specific FAQs (marked up with FAQ structured data)
  - the price story: £99 once vs typical builders charging monthly (no competitor names on the page)
  - a main button "Start your <trade> website" → `/build/?trade=<id>` with the trade preselected (keep any ?src= tag)
- Good titles, meta descriptions, canonical URLs, internal links (hub ↔ pages ↔ homepage), and each page's own link-preview image (see 4). Add them to the launch-day sitemap.
- Same Block Party styling as the homepage, accessible, good on phones.

## 3. Write the content for the current trades
- Draft the landing-page content for every trade we already support, following the rules above. Plain, warm British English; specific, not generic. Mark the PR so the PM chat can review the wording before launch.

## 4. Pre-launch polish
- Link-preview (Open Graph) images: one for the homepage, one generated per type page.
- Favicon set from the 2×2 block mark.
- A friendly 404 page (with a link to the builder and the hub).
- An FAQ page (/faq): pay once, what's included, own domain, edits, download, refunds, what happens if we close. Link from the footer.

## 5. "My business isn't listed"
- On the trade picker, add "My business isn't listed". It asks what the business is (free text), stores it anonymously in the dashboard as demand data ("requested types" table with counts), and suggests the closest pack to start with for now. No new builder flow yet.

## Rules
- Accessibility checks (axe) on all new pages, desktop and phone. Tests for pack validation, the trade preselect, requested-types logging.
- Don't change pricing, payments or generator output.

## Done when
All current trades run from packs with no change in output, pack:check and the adding-a-type guide exist, every current trade has its /websites-for/ page with real generated examples, the hub, FAQ, 404 and preview images are live, "My business isn't listed" logs requests, all tests pass, deployed. Finish with a 5-line summary, phone screenshots of one type page and the hub, how long adding a new type now takes, and open questions for my PM chat.
