# Sample photos

Stock photos for **previews only**: the contact sheet (`npm run sheet`), the builder
preview's empty photo slots, matched to the customer's trade, and the made-up example sites on
our own "Websites for…" pages (each business type's pack, `src/packs/business/<id>.ts`, lists
its photos with the credits below and which suit a hero). For those examples the build copies
the photos they show to `/photos/` on our own site, and `npm run pack:images` screenshots them;
they're labelled as examples with sample photos, never as anyone's real work. They are never published on a customer's
site, never offered as the customer's own, and never presented as anyone's own work (their
alt text says "Sample photo"). They live here, outside `public/`, so they are not part of the
production build; production loads them from our own storage (see below), and draws
placeholder photos only if that's unreachable.

All are from [Pexels](https://www.pexels.com) under the
[Pexels License](https://www.pexels.com/license/): free to use, including commercially,
modification allowed, attribution not required (recorded here anyway, since licence terms
can change). Its restrictions, none of which this use touches: don't sell unaltered copies,
don't imply endorsement by people or brands shown, don't redistribute them on stock or
wallpaper platforms, don't use them as a trademark. If these ever became a stock picker
customers could publish from, check the redistribution clause again first.

Each was checked by eye after download: no identifiable faces, no legible brand logos.
Four shortlisted photos were dropped for showing a face or a brand. In the second batch
(2026-10-11), four more were dropped for legible brands (a boiler pump and its label, a paint
tin, a breaker panel, a battery), and three were duplicates of the first batch.

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


Second batch, matched to trades, downloaded 2026-10-11 (Pexels License, re-checked the same
day; re-encoded to fit 1400px at 78% quality, metadata removed):

| File | Subject | Photographer | Pexels page |
|---|---|---|---|
| plumber-bathroom-bath.jpg | Bathroom with a corner bath | Max Vakhtbovych | https://www.pexels.com/photo/white-bathtub-and-sink-in-spacious-bathtub-at-home-6957081/ |
| plumber-shower-room.jpg | Shower room with a freestanding bath | Max Vakhtbovych | https://www.pexels.com/photo/bathroom-with-partition-and-shower-cabin-7031840/ |
| plumber-bathroom-vanity.jpg | Bathroom with a double basin | Max Vakhtbovych | https://www.pexels.com/photo/contemporary-bathroom-with-minimalistic-interior-7045908/ |
| plumber-pipe-fitting.jpg | Hands fitting a pipe | Anıl Karakaya | https://www.pexels.com/photo/plumber-installs-pipe-fittings-6419128/ |
| plumber-radiator-fitting.jpg | Gloved hands fitting a radiator pipe (no face) | Sergei Starostin | https://www.pexels.com/photo/professional-plumber-installing-a-radiator-pipe-29226620/ |
| plumber-copper-fittings.jpg | Copper fittings in a row | Nic Wood | https://www.pexels.com/photo/copper-pluming-fitting-28169591/ |
| plumber-radiator.jpg | Column radiator in a renovated room | Patrycja Grobelny | https://www.pexels.com/photo/white-steel-rib-radiator-in-a-new-bright-renovated-room-in-apartment-or-home-12034871/ |
| plumber-kitchen-tap.jpg | Chrome kitchen tap | Zulfugar Karimov | https://www.pexels.com/photo/modern-chrome-kitchen-faucet-with-running-water-34295401/ |
| painter-roller-white-wall.jpg | Roller on a white wall (hand only) | Polina Tankilevitch | https://www.pexels.com/photo/a-person-painting-a-wall-5583116/ |
| painter-roller-grey-wall.jpg | Roller on a grey wall (hand only) | Malte Luk | https://www.pexels.com/photo/person-holding-paint-roller-on-wall-1669754/ |
| painter-roller-cream-wall.jpg | Yellow roller on a cream wall (hand only) | Polina Tankilevitch | https://www.pexels.com/photo/hand-holding-a-pain-roller-5583126/ |
| painter-rollers.jpg | Two rollers on wood | Polina Tankilevitch | https://www.pexels.com/photo/paint-rollers-on-wooden-surface-5583052/ |
| painter-rollers-brushes.jpg | Rollers and brushes, top view | Polina Tankilevitch | https://www.pexels.com/photo/painting-materials-on-wooden-table-5583059/ |
| painter-finished-room.jpg | Freshly finished empty room | Max Vakhtbovych | https://www.pexels.com/photo/clean-unfurnished-apartment-room-8146336/ |
| painter-stepladder-room.jpg | Stepladder and tools in a room | Blue Bird | https://www.pexels.com/photo/brown-wooden-stepladder-in-a-room-7217930/ |
| painter-roller-wall.jpg | Roller on an interior wall (hands only) | Blue Bird | https://www.pexels.com/photo/people-painting-the-wall-7218011/ |
| roofer-slate-dormers.jpg | Slate roof with two dormers | Michaela St | https://www.pexels.com/photo/slate-rooftop-with-green-shuttered-dormers-37771658/ |
| roofer-slate-close-up.jpg | Slate roof, close up | christian hembert | https://www.pexels.com/photo/traditional-slate-roof-with-textured-patterns-37521406/ |
| roofer-chimney.jpg | Brick chimney on a tiled roof | Lena Netkach | https://www.pexels.com/photo/red-brick-chimney-on-tiled-roof-against-blue-sky-39246453/ |
| roofer-clay-tile-roofs.jpg | Clay tile roofs against blue sky | Jan van der Wolf | https://www.pexels.com/photo/red-roof-tiles-against-clear-blue-sky-29114658/ |
| roofer-gutter.jpg | Downpipe on a red wall | Jan van der Wolf | https://www.pexels.com/photo/rain-gutter-on-a-wall-25907259/ |
| roofer-tiling-in-progress.jpg | Tile roof part-installed | Clément Proust | https://www.pexels.com/photo/roof-installation-with-terracotta-tiles-in-progress-31763541/ |
| roofer-roof-renovation.jpg | Roof renovation with a ladder | Clément Proust | https://www.pexels.com/photo/rustic-roof-renovation-with-chimney-and-ladder-31763534/ |
| roofer-slate-roof-house.jpg | House with a slate roof | Arlind D | https://www.pexels.com/photo/charming-european-house-with-slate-roof-and-flowers-33843410/ |
| electrician-junction-box.jpg | Open junction box | Kindel Media | https://www.pexels.com/photo/close-up-photo-of-opened-switchboard-8488029/ |
| electrician-junction-wiring.jpg | Junction box wiring | Kindel Media | https://www.pexels.com/photo/close-up-photo-of-opened-switchboard-8488059/ |
| electrician-socket-boxes.jpg | Socket boxes with wiring | La Miko | https://www.pexels.com/photo/holes-on-white-wall-with-electrical-wires-3615735/ |
| electrician-light-switches.jpg | Light switches on a stone wall | Srattha Nualsate | https://www.pexels.com/photo/white-light-rocker-switches-on-gray-wall-12996907/ |
| electrician-kitchen-lights.jpg | Pendant lights over a kitchen island | Max Vakhtbovych | https://www.pexels.com/photo/modern-interior-of-spacious-minimalist-kitchen-6283972/ |
| electrician-fitting-sockets.jpg | Hands wiring a socket (no face) | Ksenia Chernaya | https://www.pexels.com/photo/an-electrician-using-pliers-to-repair-the-ac-power-plugs-and-sockets-5691588/ |
| electrician-consumer-unit.jpg | Open consumer unit | Ksenia Chernaya | https://www.pexels.com/photo/an-opened-switchbox-5767595/ |
| electrician-socket-wiring.jpg | Open socket box with wires | Ksenia Chernaya | https://www.pexels.com/photo/power-socket-during-construction-on-building-5691642/ |
| landscaper-lawn-wall.jpg | Lawn beside a timber wall | Scott Webb | https://www.pexels.com/photo/white-wooden-wall-136097/ |
| landscaper-lawn-hedges.jpg | Lawn with clipped hedges | MAG Photography | https://www.pexels.com/photo/lush-garden-with-greenery-and-manicured-lawn-38194805/ |
| landscaper-garden-path.jpg | Garden path by a gazebo | Max Vakhtbovych | https://www.pexels.com/photo/garden-with-path-near-plants-and-trees-near-gazebo-7174111/ |
| landscaper-decking.jpg | Timber decking with a dining set | Max Vakhtbovych | https://www.pexels.com/photo/terrace-in-house-7587879/ |
| landscaper-lawn-mower.jpg | Mower on a lawn (worn decal, not legible) | Magda Ehlers | https://www.pexels.com/photo/red-and-black-push-lawn-mower-on-green-grass-4162016/ |
| landscaper-hedge-trimming.jpg | Hedge trimming (hands only) | Magda Ehlers | https://www.pexels.com/photo/man-trimming-hedges-with-garden-shears-38936347/ |
| landscaper-tulip-border.jpg | Tulip border | Ivan Dražić | https://www.pexels.com/photo/multi-colored-flowerbed-16327475/ |
| landscaper-brick-path.jpg | Brick path through planting | Chris F | https://www.pexels.com/photo/tranquil-garden-pathway-with-lush-greenery-39810397/ |
| landscaper-stone-path.jpg | Stone path through a garden | Flowers iso | https://www.pexels.com/photo/serene-stone-pathway-through-vibrant-green-garden-31363617/ |
| landscaper-hydrangeas.jpg | Hydrangeas by a wall | Valeria Nikitina | https://www.pexels.com/photo/green-plants-in-the-garden-9678161/ |

## Hosting for production builds

The builder shows these in empty photo slots (PM decision, 2026-10-02): yes in the builder
preview, never on published sites. Production loads them from our own storage:

1. Upload the files above, unchanged names, to the R2 bucket under `samples/`
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
