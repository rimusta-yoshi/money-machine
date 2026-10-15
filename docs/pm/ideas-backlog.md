# Ideas backlog (after trades launch)

## Post-launch roadmap shape (rob + PM, 13 Oct 2026)
- Two post-launch priorities: (1) scale business types fast so SEO starts compounding early; (2) the brand/UI generator. rob expects full days soon, so months 1–2 = ads + types + brand generator in parallel.
- Month 1: pack system live, ~30 simple trades, "My business isn't listed" path, first ad tests (Google + Meta).
- Month 2: new sections that unlock the most types (see waves), combined trades, more packs; artist interviews.
- Month 2–3: free brand/UI generator (doubles as a backlink magnet) → feeds the builder as a custom theme.
- Later: print-on-demand, A/B machine, city pages, international.

## Section waves (what code each wave needs)
- Sections are a shared library; packs pick from it. New code is only for section types that don't exist yet, and each new section unlocks many packs. pack:check reports "blocked on section X".
- Wave 1, no new sections: simple trades (plumber, electrician, roofer, plasterer, tiler, painter & decorator, carpenter, landscaper, locksmith, handyman…), ~30.
- Wave 2, a few new static sections unlock ~20–30 more types:
  - Price list / menu (cafés, private chefs, caterers, hairdressers, barbers, beauticians, nail techs, cleaners, dog walkers, groomers, tutors)
  - Opening hours (cafés, shops, salons)
  - Booking button linking to the tool they already use (Fresha, Booksy, Treatwell, Calendly, etc.) — stays static and pay-once
- Wave 3: portfolio + events (artists, photographers, musicians, event sites).
- Real calendars/booking systems: ongoing server cost and support; avoid. Link out instead. Only build if a vertical clearly needs it, possibly as a paid extra.

## Scale plan: business-type packs (rob, 13 Oct 2026)
- Ambition: from ~5 trades at launch to 15 by end of month one, 30–50 by mid-year, 80–100 business types in year one. Year two+: Ireland, Australia, US, later non-English.
- Rough upside maths (rob): 100 types × 10 countries, 0–4 sales/month each → ~400 sales/month a couple of years in. Treat as upside, not plan.
- Every business type = a data "pack" (services, copy defaults, sections, theme leanings, sample photos, landing-page content, FAQs). One pack feeds both the builder and its /websites-for/<type> page.
- Bottleneck is content quality per type. Pack factory: PM drafts pack content, rob reviews, coding agent adds photos + checks.
- SEO: compounding but slow (6–12+ months for a new domain). Google's scaled-content/doorway policy punishes mass pages that only swap a word. Each type page needs genuinely specific value (generated example sites, a trade must-haves checklist, trade FAQs). City pages only with real local substance — later.
- Layout variety from the generator doesn't fix duplicate content; the words must differ for real reasons.
- Competitor: Built Local, £99 setup + £49/month, edits limited (rob's read). Ad angle: "Their first month costs what our whole site costs" (keep claims accurate and dated).

## "My business isn't listed" (build from scratch)
- Generic pack: pick sections (hero required), more of your own copywriting. What people type tells us which packs to build next (first version: logging, in the packs brief).

## Combined trades
- Builder: main trade + "I also do…" (merges services and sections from other packs). No page per combo; dedicated pages only for combos searched as one phrase (plumbing & heating, painting & decorating).

## Brand / UI generator ("Coolors for brand systems")
- Free tool: lock/carousel colours and fonts → a usable UI/brand system. Works on phone. Feeds the builder as the customer's own theme, inside our colour-role and contrast checks.
- Free tools earn backlinks (SEO). Later: print-on-demand (business cards, flyers, van stickers) as one-off purchases or affiliate.

## Mobile builder: later additions
- QR "add photos from your phone" when building on a computer (needs live sync). After launch.

## Self-optimising pages ("champion" A/B machine)
- Multi-armed bandit on our own pages. Needs hundreds of visits a day; park until traffic. Seed: dashboard logs kept layouts.

## Generator as a product (API / MCP)
- Different business (developer tools); distraction before Local Blocks earns. Revisit later. If ever pursued, the generator's origin (first mock-up on a work account at lunch with the boss's verbal OK) matters more; rob keeps a private note.

## Artist sites (post-launch, strongest signal so far)
- Several artists complained unprompted about cost; some can't build a site at all. Goal: "see my work" + enquire/buy + shows. Needs portfolio, artwork pages, events, maybe selling via the artist's own Stripe (no platform cut).
- Pay-once viable: R2 ~$0.015/GB-month, 10 GB free, no egress; 200 images ≈ 60 MB ≈ under 1p/month.
- Before building: 5–10 artist interviews.

## Event sites
- Exhibitions, gigs, pop-ups. Content: event, date, venue, tickets link, lineup, gallery. Short-lived, cheap to host; ~£20–40, "split the cost". After trades proves the funnel.

## Other verticals
- Hairdressers, barbers, dog walkers, cleaners: mostly wave 2. Subscription only for verticals with genuine ongoing costs.

## Own domains: costs and referral income (15 Oct 2026)
- Own domains included in the £99 for now (Cloudflare for SaaS: first 100 free, then ~$0.10/month each, ~£950/yr per 1,000 domains).
- Revisit at ~500 sales with real data on how many connect a domain. If needed: £10 one-off when connecting (covers ~10 years), refundable within 14 days like the £99 (refund disconnects). Never monthly (Stripe's ~20p fee makes micro-charges lose money); never change what existing customers already paid for.
- Referral income as a cushion: domain affiliates (IONOS first, also covers 123-reg/Fasthosts; GoDaddy and Namecheap one-off ~10–20%), and business email referrals (Google Workspace UK: £6 per mailbox on Starter, paid after 90 days; Microsoft 365 via registrar affiliates). rob applies; links stay swappable in config; label "We may earn a small commission".
- Terms (legal check): describe what's included at the time of purchase, so pricing can change for new customers.
