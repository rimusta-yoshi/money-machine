# Adding a business type

Everything about a business type lives in one pack file, `src/packs/business/<id>.ts`. The
builder, the homepage chips, the `/websites-for/` hub and the type's own page all read packs.
Adding a type is a content job: one file, some photos, two lines in two lists, then two
commands. No other code changes.

Written so it can be followed with no other context. `src/packs/business/plumber.ts` is a
finished pack to copy from.

## What a pack is

A pack file has two exports:

- `<id>` (via `definePack`): what the builder needs. Names, synonyms, category, colours and
  starting theme, the site's own words (tagline, main button), services, badges, which sections
  the site gets and in what order, and sample photos with their licence.
- `<id>Landing`: the `/websites-for/<slug>/` page. Title, search description, headline, intro,
  "What a … website needs", FAQs and three made-up example businesses.

The schema with every rule (lengths, counts) is `src/packs/schema.ts`. Sections come from a
shared library, `src/packs/sections.ts`: a pack only picks from it.

## Steps

1. **Pick the id and slug.** The id is singular, lower case, letters and dashes
   (`window-cleaner`). It goes into saved sites, so never change it once live. The slug is the
   page address, usually the plural (`window-cleaners` gives `/websites-for/window-cleaners/`).

2. **Copy the template.** Copy `docs/pack-template.ts` to `src/packs/business/<id>.ts`. Rename
   the two exports: `TODO_ID` to the id in camel case (`windowCleaner`) and `TODO_IDLanding` to
   `windowCleanerLanding`.

3. **Fill in every TODO.** Plain, warm British English. Write for this trade only: the
   checklist, intro and FAQs must say things that are true of this trade and not the others
   (pack:check measures how alike packs read and refuses near-copies). Only promise what the
   builder does today (no booking, no quote form yet). Badges are offered, never added for the
   customer, so they can be specific ("Gas Safe registered").

4. **Choose sections.** From `src/packs/sections.ts`. The hero comes first; include contact.
   `testimonials` should be `optional: true` (it appears when the customer turns reviews on).
   If the type needs a section that isn't built yet (`menu`, `price_list`, `opening_hours`,
   `booking_button`, `portfolio`, `events`), list it anyway: the pack then waits (step 6).

5. **Add photos.** At least three, one or more marked `hero: true` (landscape, uncluttered).
   For each: put the .jpg in `reference/sample-photos/` (resized to fit 1400px, about 78%
   quality, metadata removed), add a row to `reference/sample-photos/LICENCE.md` with the
   photographer and Pexels page, and give it alt text starting "Sample photo: ". No faces, no
   legible brands. Upload them to storage with `npm run cf:samples` when deploying.

6. **List the pack.** In `src/packs/index.ts`, import it and add it to `PACKS` (the order is
   the trade picker's order). If it needs an unbuilt section, add it to `WAITING_PACKS` instead:
   it's checked but not offered. In `src/packs/pages.ts`, import `<id>Landing` and add it to
   `LANDINGS` (TypeScript says if it's missing). Waiting packs have no page yet.

7. **Check it.** `npm run pack:check`. Fix every error (✗). Read the warnings (!): shared
   phrases between packs are worth rewording. It also lists which planned sections would unlock
   the most waiting packs.

8. **Make its images.** `npm run pack:images -- <slug>` takes the three example screenshots
   and the link-preview image into `public/` (it needs Chrome or Edge installed). Look at them:
   if an example looks wrong, change its `seed` and run it again. Commit the images.

9. **Look at the page.** `npm run dev`, then open `/websites-for/<slug>/` and
   `/build/?trade=<id>`. `npm run page-shots -- /websites-for/<slug>/` saves phone and desktop
   screenshots into `docs/pm/screenshots/` for review.

10. **Test and open a pull request.** `npx tsc -b`, `npm run lint`, `npm test` (it runs the pack
    checks, every page's structure and the trade preselect for every pack) and the quick stress
    test, `npm run stress -- --seeds 5 --pages 4`. The new type is in the stress matrix
    automatically.

## What you get without doing anything else

- The trade picker in the builder, and `/build/?trade=<id>` preselecting it.
- `/websites-for/<slug>/` with three generated examples, the checklist, services, sections,
  FAQs (with FAQ structured data), the price story and links to the other types.
- A card on the `/websites-for/` hub under its category, and a sitemap entry for launch.
- A homepage chip, if `featured: true`.
- Matching in "My business isn't listed" by its name and synonyms.

## Time it takes

About an hour for a simple trade: 30 to 40 minutes writing the copy, 15 minutes finding and
licensing photos, 5 minutes for the checks and images. Most of it is writing.

## Not built yet (the schema leaves room)

- Combined trades ("I also do…"): a pack with `kind: 'combined'` naming the packs it merges.
- A generic "build from scratch" pack: `kind: 'scratch'`, with no trade wording.
- The planned sections above: once one is built in `src/gen/sections`, move its name from
  `PLANNED_SECTIONS` to `SECTION_TYPES` and move the packs it unlocks into `PACKS`.
