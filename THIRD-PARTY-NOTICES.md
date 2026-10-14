# Third-party notices

Local Blocks uses the third-party software, fonts and images listed here, each under its own
licence. Checked 13 October 2026 (versions from `package-lock.json`).

Where the notices travel with what we ship:

| What ships | Notices shipped with it |
|---|---|
| Homepage, builder and dashboard (browser code) | `/third-party-notices.md`, written by every build from the bundled packages (`build.license` in `vite.config.ts`) |
| Fonts (our pages, every customer site, every "Download your site" zip) | `/fonts/LICENSES.txt`: each font's copyright line and the full SIL Open Font License, written by `scripts/copy-fonts.mjs` |
| Customer websites | No third-party code at all; only the fonts above |
| API and site workers | Run on our servers only (not distributed); listed here anyway |

## Software

| Package | Version | Licence | Copyright | Ships in |
|---|---|---|---|---|
| react | 19.2.6 | MIT | Meta Platforms, Inc. and affiliates | Homepage, builder, dashboard |
| react-dom | 19.2.6 | MIT | Meta Platforms, Inc. and affiliates | Homepage, builder, dashboard |
| scheduler | 0.27.0 | MIT | Meta Platforms, Inc. and affiliates | Homepage, builder, dashboard |
| zod | 4.6.5 | MIT | Colin McDonnell | Builder; API worker |

The site worker and the old-domain redirect worker use no third-party code.

## Fonts

Self-hosted copies (latin subset, WOFF2) from Fontsource (https://fontsource.org), all under
the SIL Open Font License 1.1. The copyright lines and the full licence text are in
[`public/fonts/LICENSES.txt`](public/fonts/LICENSES.txt).

Anton, Barlow, Barlow Condensed, Bricolage Grotesque, DM Sans, Fraunces, Instrument Sans, Inter,
Libre Franklin, Nunito Sans, Schibsted Grotesk, Unbounded.

## Icons

The icons on our pages, in the builder and on customer websites are drawn for Local Blocks
(inline SVG in `src/gen/core/markup.ts`, `src/home/GetIcon.tsx`, `src/components/ui/Icon.tsx`).
Two unused icons of unrecorded origin (Feather/Lucide-like) and the starter template's
`/icons.svg` (other companies' logos) were deleted on 14 October 2026.

The favicon (the Local Blocks block mark) and the guide's pictures (`public/guide/*.svg`) are
drawn for Local Blocks.

## Images

- **Sample photos** (`reference/sample-photos/`): 50 photos from Pexels under the Pexels
  License, with each photographer listed in `reference/sample-photos/LICENCE.md`. Shown only in
  the builder's preview, never published on customer websites or in downloads.
- **Customer photos** belong to the customers who upload them (terms, section 5).

## Development tools (not shipped)

Built and tested with Vite, TypeScript, ESLint, Vitest, jsdom, Testing Library, esbuild,
Wrangler and Miniflare, Playwright and axe-core. Their licences are MIT, Apache-2.0, ISC, BSD
and MPL-2.0 (axe-core, Lightning CSS); a few build-time packages are LGPL-3.0-or-later (sharp's
image binaries) or CC-BY-4.0 (caniuse-lite data). None of their code is in the homepage, the
builder, the workers or customer websites. Nothing in `node_modules` is GPL, AGPL, SSPL,
non-commercial or unlicensed.
