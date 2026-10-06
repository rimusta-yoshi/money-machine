# Site Blocks design handoff (Block Party brand)

Design targets for the product's own brand, homepage and builder UI. Customer-site themes (src/gen/themes) are NOT part of this.

## How to read the mockups
The files in mockups/ are design-canvas source (HTML + inline styles). They don't run on their own:
- `{{name}}` is a value from `renderVals()` in the script at the bottom of each file.
- `<sc-for list="{{items}}" as="x">` repeats its children; `<sc-if value="{{cond}}">` shows them when true.
- `<x-dc>`, `<helmet>` and `support.js` are canvas wrappers. Ignore them, but keep the `<helmet><style>` rules (hover, motion, responsive) as the intent.
Treat them as precise visual and interaction specs: colours, sizes, radii, copy and behaviour are all intended.

## Files
01 brand sheet · 02 homepage · 03/04 builder start (desktop / phone) · 05 your look · 06/07 build (desktop / phone) · 08 go live

See BRAND.md for the tokens.
