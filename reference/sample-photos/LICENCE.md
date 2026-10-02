# Sample photos

Stock photos for **previews only**: the contact sheet (`npm run sheet`) and, on the dev
server, the builder preview's empty photo slots. They are never published on a customer's
site, never offered as the customer's own, and never presented as anyone's own work (their
alt text says "Sample photo"). They live here, outside `public/`, so they are not part of the
production build, where the builder draws placeholder photos instead.

All are from [Pexels](https://www.pexels.com) under the
[Pexels License](https://www.pexels.com/license/): free to use, including commercially,
modification allowed, attribution not required (recorded here anyway, since licence terms
can change). Its restrictions, none of which this use touches: don't sell unaltered copies,
don't imply endorsement by people or brands shown, don't redistribute them on stock or
wallpaper platforms, don't use them as a trademark. If these ever became a stock picker
customers could publish from, check the redistribution clause again first.

Each was checked by eye after download: no identifiable faces, no legible brand logos.
Four shortlisted photos were dropped for showing a face or a brand.

| File | Subject | Photographer | Pexels page | Downloaded |
|---|---|---|---|---|
| bathroom.jpg | Modern bathroom with a glass shower | Max Vakhtbovych | https://www.pexels.com/photo/interior-of-modern-bathroom-with-glass-shower-cabin-7005268/ | 2026-10-01 |
| worker-hi-vis.jpg | Worker in a hard hat and hi-vis jacket, from behind | Jan Zakelj | https://www.pexels.com/photo/back-view-of-a-person-wearing-white-hard-hat-and-reflectorize-jacket-13182107/ | 2026-10-01 |
| kitchen.jpg | Modern kitchen, wood cabinets | Max Vakhtbovych | https://www.pexels.com/photo/an-interior-of-a-modern-kitchen-counter-7045356/ | 2026-10-01 |
| roof-tiles.jpg | Clay roof tiles going onto battens | Clément Proust | https://www.pexels.com/photo/roof-construction-with-red-tiles-and-wooden-framework-31763538/ | 2026-10-01 |
| painting-wall.jpg | Painting a ceiling with a roller (from behind) | Ksenia Chernaya | https://www.pexels.com/photo/crop-woman-painting-walls-at-home-5691677/ | 2026-10-01 |
| garden-patio.jpg | Patio with garden furniture and hedging | Sergej (strannik-sk) | https://www.pexels.com/photo/modern-outdoor-patio-with-wooden-furniture-38188641/ | 2026-10-01 |
| garden-path.jpg | Paved side path by a fence | Daniel Agundiz | https://www.pexels.com/photo/backyard-stone-path-with-wooden-fence-36866669/ | 2026-10-01 |
| workshop-tools.jpg | Workbench with hand tools | Ahimsa - OM | https://www.pexels.com/photo/organized-workshop-with-hand-tools-and-clamps-34471533/ | 2026-10-01 |

## Hosting for production builds

The builder shows these in empty photo slots (PM decision, 2026-10-02): yes in the builder
preview, never on published sites. Production loads them from our own storage:

1. Upload the eight files above, unchanged names, to the R2 bucket under `samples/`
   (`npm run cf:samples`; see server/README.md). The API worker serves them at
   `https://api.siteblocks.co.uk/samples/<file>`. The bucket itself stays private.
2. The API only lets the builder's origins (its `BUILDER_ORIGINS` setting) fetch them; the builder
   reads them into data URLs.
3. Build with `VITE_SAMPLE_PHOTOS_URL=https://api.siteblocks.co.uk/samples` (see `.env.example`).

Without it, a production build draws placeholder photos instead. Licence re-checked on
2026-10-02 against https://www.pexels.com/license/: showing them in our own app and hosting
copies ourselves are fine; the limits that matter are no redistribution as stock (they are
never offered for download or as a library), no implied endorsement by people or brands shown,
and no use as a trademark or business name. Never publish them as a customer's own work.
