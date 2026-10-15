# Sales milestones: what to check at each

rob, 15 Oct 2026: 500 sales is the first big milestone; 1, 10, 50 and 100 come before it. Each milestone is a moment to stop and look, not a deadline. The PM brings this list up when a milestone is reached (the dashboard's paid count).

## 1 sale
- Celebrate.
- Check the whole journey worked for a real person: payment, welcome email, edit link, site live, Stripe payout reaches Monzo Business.
- Ask them (lightly) how they found us and what nearly stopped them.

## 10 sales
- Read the funnel on /admin: where do people drop off? Which ads/sources sold?
- Support load: how many emails per sale, and what about? Turn repeat questions into FAQ lines.
- Refund rate (Stripe keeps ~£1.70 per refund): any pattern?
- How many connected a custom domain?

## 50 sales
- Which business types sell; which are requested ("My business isn't listed") → next packs.
- Ad spend per sale vs £99: is the ad test profitable? Scale or change?
- Keep simple records for HMRC (should already be routine).

## 100 sales
- Custom domains: approaching Cloudflare's 100 free? (dashboard counter). Each one after costs ~$0.10/month.
- D1/R2/Workers usage vs plan limits (Workers Paid since launch).
- Backups: test a restore of D1 records and R2 photos, not just that backups exist.
- Consider the UK trade mark if not done (before heavy ad spend).

## 500 sales (first big milestone)
- **Pricing review** with real data: own-domain uptake (revisit a £10 one-off connection fee, refundable 14 days; never monthly; never for existing customers), refund rate, founding/promo prices, paid extras.
- **Senior developer review** (freelance or a connection): look over the system for scale: database schema and indexes, D1 limits, R2 layout, caching, cron jobs, security, backups, cost per site. Prepare a short handover doc beforehand.
- **VAT:** at £99 a sale, the £90k VAT threshold is ~909 sales in any rolling 12 months. At 500, check the rolling total monthly and plan registration (prices may need to include VAT).
- Professional indemnity insurance, if not already in place.
- Support: still manageable weekly, or does it need a better system?

## 750–800 sales: business and product plan
- **VAT is close** (~909 sales in any rolling 12 months at £99). Decide before it's forced: register, and either raise the price to absorb the 20% or accept lower margin.
- **Business structure:** get an accountant (a few hundred pounds a year, worth it here). Ask about moving from sole trader to a limited company (can mean less tax at higher profits, and separates personal and business liability), VAT timing and schemes (e.g. Flat Rate), and what records they need from us.
- **Price review:** with VAT in mind, set by real numbers: cost to win a customer (ad spend per sale, CAC), refund rate, support time, hosting and domain costs per site, profit per sale. If CAC is high and profit thin, raise the price for new customers.
- **Product plan:** what next, from the requested types, support questions and funnel data: paid extras, more business types, the brand generator, new countries.

## Later
- 1,000+: VAT likely; custom domains ~£950/yr; revisit infrastructure again.
- 10,000: the dream.
