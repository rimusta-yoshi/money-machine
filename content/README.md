# Page text

The words on Local Blocks' own plain pages, one Markdown file per page. Edit them here; the
build turns them into pages with the homepage's look (see `src/pages/`).

| File | Page |
|---|---|
| `legal/privacy.md` | `/privacy/` |
| `legal/terms.md` | `/terms/` |
| `guide/host-your-own-site.md` | `/guide/host-your-own-site/` |
| `faq.md` | `/faq/` |

Words in double curly brackets are filled in by the build, so each is set in one place:

| Word | Comes from | Example |
|---|---|---|
| `{{brand}}` | `src/brand/config.ts` (`name`) | Local Blocks |
| `{{domain}}` | `src/brand/config.ts` (`domain`) | localblocks.co.uk |
| `{{email}}`, `{{abuseEmail}}` | `src/brand/config.ts` | hello@localblocks.co.uk |
| `{{owner}}`, `{{address}}`, `{{ico}}`, `{{updated}}` | `src/brand/config.ts` (`legal`) | your name, business address, ICO number, the date the text last changed |
| `{{price}}` | `PRICE_PENCE` in `server/wrangler.api.jsonc` | £99 |
| `{{guaranteeDays}}` | `src/brand/config.ts` (`guarantee.days`) | 14 |

Before launch, fill in `legal` in `src/brand/config.ts`. While any of them still reads like
`[FULL NAME]`, the pages show it highlighted, and a production build with `LAUNCHED` set to
`"true"` stops with an error naming it.

What the Markdown can do: `#`, `##` and `###` headings, paragraphs, `-` and `1.` lists, tables,
`> ` notes, `**bold**`, `*italic*`, `[links](/terms/)` and `![pictures](/guide/picture.svg)`.
