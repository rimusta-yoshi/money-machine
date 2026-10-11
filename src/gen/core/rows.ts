/**
 * Balanced rows for lists of cards, photos and badges: rows as even as possible, so a
 * list never ends in one lonely item beside an empty stretch. Seven photos at three a
 * row become 3 + 2 + 2, never 3 + 3 + 1. Where pairs can't be even (an odd count at two a
 * row), the first item takes the whole first row as a lead and the rest pair up.
 *
 * Lists use the .sb-bal class (core/css.ts); each item carries its row's size as
 * --sb-k (desktop) and --sb-km (phone), and takes that share of the row.
 */

/** How many items go on each row, top to bottom, for `n` items with at most `max` a row. */
export function rowSizes(n: number, max: number): number[] {
  if (n <= 0) return []
  const cap = Math.max(1, Math.floor(max))
  if (n <= cap) return [n]
  if (cap === 1) return Array<number>(n).fill(1)
  if (cap === 2) return n % 2 ? [1, ...Array<number>((n - 1) / 2).fill(2)] : Array<number>(n / 2).fill(2)
  const rows = Math.ceil(n / cap)
  const base = Math.floor(n / rows)
  const extra = n % rows
  return Array.from({ length: rows }, (_, i) => base + (i < extra ? 1 : 0))
}

/** Each item's row size, in order. */
export function itemRowSizes(n: number, max: number): number[] {
  return rowSizes(n, max).flatMap(k => Array<number>(k).fill(k))
}

/** Inline custom properties for item i of a balanced list (desktop and phone row sizes). */
export function balancedVars(n: number, max: number, maxPhone: number): string[] {
  const desk = itemRowSizes(n, max)
  const phone = itemRowSizes(n, maxPhone)
  return desk.map((k, i) => `--sb-k:${k};--sb-km:${phone[i]};`)
}

/** `<li>` items for a balanced list: each gets its row share. `cls` and `attrs` go on every item. */
export function balancedItems(inner: readonly string[], max: number, maxPhone: number, cls = '', attrs: (i: number) => string = () => ''): string {
  const vars = balancedVars(inner.length, max, maxPhone)
  return inner.map((html, i) => `<li${cls ? ` class="${cls}"` : ''} style="${vars[i]}"${attrs(i)}>${html}</li>`).join('')
}

/** Gap between items: --sb-bg-gap when a list sets it, else a little under the theme gap (a grid of cards: 1.5×). */
const GAP = 'var(--sb-bg-gap,calc(var(--sb-gap) * 0.9))'
export const ROWS_CSS = `
.sb-sec .sb-bal{display:flex;flex-wrap:wrap;gap:${GAP}}
.sb-sec .sb-bal.sb-grid{--sb-bg-gap:calc(var(--sb-gap) * 1.5)}
.sb-sec .sb-bal>li{flex:0 0 calc((100% - (var(--sb-k,1) - 1) * ${GAP}) / var(--sb-k,1) - 0.05px);min-width:0}
@container (max-width: 719px){
  .sb-sec .sb-bal>li{flex-basis:calc((100% - (var(--sb-km,1) - 1) * ${GAP}) / var(--sb-km,1) - 0.05px)}
}
`

/** Gives ready-made `<li …>` items their balanced row sizes (merged into any style they carry). */
export function withRowVars(items: readonly string[], max: number, maxPhone: number): string {
  const vars = balancedVars(items.length, max, maxPhone)
  return items.map((li, i) => (/^<li\b[^>]*\sstyle="/.test(li)
    ? li.replace(/^(<li\b[^>]*\sstyle=")/, `$1${vars[i]}`)
    : li.replace(/^<li\b/, `<li style="${vars[i]}"`))).join('')
}
