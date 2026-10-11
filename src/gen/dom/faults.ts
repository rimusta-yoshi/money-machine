import type { Faults } from '../core/types'

const styleOf = (el: Element): CSSStyleDeclaration => (el.ownerDocument.defaultView ?? window).getComputedStyle(el)

/**
 * Layout faults only a real layout engine can see, read from one laid-out section:
 * - orphans: an item alone on its row of a grid whose other rows hold several, not filling the row;
 * - holes: a grid row ending in a large empty stretch, or side-by-side blocks marked data-fill
 *   whose heights differ a lot (one leaves a big empty area under it);
 * - text overlap: text sitting on other text or on a control (decorations marked data-over
 *   are the cover check's business);
 * - overflow: text or a control reaching outside the section's box.
 * Deliberate sideways scrollers ([data-scroll]) and screen-reader-only text are skipped.
 */

const SKIP = '[data-scroll], .sb-sr'
/** Lists that wrap like words (chips, ticks, stickers): a short last line is natural there. */
const FLOW = '[data-flow], .sb-row'
/** Controls drawn as boxes. Plain text links count as text. */
const CONTROLS = 'button, input, textarea, select, .sb-btn'

const visible = (r: DOMRect) => r.width > 0.5 && r.height > 0.5

interface Row { top: number; bottom: number; items: DOMRect[] }

/** Children grouped into rows by vertical overlap (so staggered grids still read as rows). */
function rowsOf(rects: readonly DOMRect[]): Row[] {
  const rows: Row[] = []
  for (const r of [...rects].sort((a, b) => a.top - b.top || a.left - b.left)) {
    const row = rows.find(x => Math.min(x.bottom, r.bottom) - Math.max(x.top, r.top) >= 0.4 * Math.min(r.height, x.bottom - x.top))
    if (row) {
      row.items.push(r)
      row.top = Math.min(row.top, r.top)
      row.bottom = Math.max(row.bottom, r.bottom)
    } else rows.push({ top: r.top, bottom: r.bottom, items: [r] })
  }
  return rows
}

/** Grid-like containers: two or more laid-out children of similar width, in at least one shared row. */
function gridFaults(root: HTMLElement, detail: string[]): { orphans: number; holes: number } {
  let orphans = 0
  let holes = 0
  const containers = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))].filter(el => el.children.length >= 2 && !el.closest(SKIP) && !el.matches(FLOW))
  for (const el of containers) {
    const cs = styleOf(el)
    if (!(cs.display.includes('grid') || (cs.display.includes('flex') && cs.flexWrap === 'wrap'))) continue
    const kids = Array.from(el.children).filter(k => {
      const s = styleOf(k)
      return s.position !== 'absolute' && s.position !== 'fixed' && s.display !== 'none'
    }).map(k => k.getBoundingClientRect()).filter(visible)
    if (kids.length < 2) continue
    const rows = rowsOf(kids)
    const multi = rows.filter(r => r.items.length >= 2)
    if (!multi.length || rows.length < 2) continue
    // Chip lists wrap naturally; only cells of a similar width make a grid.
    const widths = multi.flatMap(r => r.items.map(i => i.width))
    if (Math.max(...widths) / Math.min(...widths) > 1.6) continue
    const box = el.getBoundingClientRect()
    const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
    const inner = box.width - pad
    const left = box.left + parseFloat(cs.paddingLeft)
    const right = left + inner
    const name = `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]}`
    for (const r of rows) {
      if (r.items.length === 1 && r.items[0].width < 0.75 * inner) {
        orphans++
        detail.push(`orphan in ${name}`)
        continue
      }
      const xs = r.items.map(i => [i.left, i.right]).sort((a, b) => a[0] - b[0])
      const gaps = [xs[0][0] - left, right - xs[xs.length - 1][1]]
      if (Math.max(...gaps) >= 0.4 * inner) {
        holes++
        detail.push(`gap at the end of a row in ${name}`)
      }
    }
  }
  // Blocks meant to sit side by side as one filled shape (a big photo and its thumbnails).
  root.querySelectorAll<HTMLElement>('[data-fill]').forEach(el => {
    const kids = Array.from(el.children).map(k => k.getBoundingClientRect()).filter(visible)
    for (const r of rowsOf(kids).filter(x => x.items.length >= 2)) {
      const hs = r.items.map(i => i.height)
      const diff = Math.max(...hs) - Math.min(...hs)
      if (diff > 80 && diff > 0.25 * Math.max(...hs)) {
        holes++
        detail.push(`uneven blocks in ${el.className.toString().split(' ')[0]}`)
      }
    }
  })
  return { orphans, holes }
}

interface Box { rect: DOMRect; owner: Element }

/**
 * A text line's box is the font's whole ascent and descent, much taller than the letters in
 * display faces; the middle of it is where the glyphs are. Overlaps are judged on that.
 */
const glyphBand = (r: DOMRect): DOMRect => new DOMRect(r.left, r.top + r.height * 0.22, r.width, r.height * 0.56)

/** Every visible line of text, with the element it belongs to. */
function textLines(root: HTMLElement): Box[] {
  const doc = root.ownerDocument
  const out: Box[] = []
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const node = walker.currentNode
    const el = node.parentElement
    if (!node.textContent?.trim() || !el || el.closest(`${SKIP}, [data-over]`)) continue
    const range = doc.createRange()
    range.selectNodeContents(node)
    for (const rect of Array.from(range.getClientRects())) if (visible(rect)) out.push({ rect: glyphBand(rect), owner: el })
  }
  return out
}

const area = (a: DOMRect, b: DOMRect) =>
  Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))

/** Clearly overlapping: more than a quarter of the smaller box, and by more than a few px each way. */
function clash(a: DOMRect, b: DOMRect): boolean {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
  return w > 3 && h > 3 && area(a, b) > 0.25 * Math.min(a.width * a.height, b.width * b.height)
}

const related = (a: Element, b: Element) => a === b || a.contains(b) || b.contains(a)

function textOverlap(root: HTMLElement, lines: readonly Box[], detail: string[]): number {
  const controls = Array.from(root.querySelectorAll(CONTROLS))
    .filter(el => !el.closest(`${SKIP}, [data-over]`))
    .map(owner => ({ rect: owner.getBoundingClientRect(), owner }))
    .filter(c => visible(c.rect))
  let n = 0
  for (let i = 0; i < lines.length; i++) {
    const a = lines[i]
    for (let j = i + 1; j < lines.length; j++) {
      const b = lines[j]
      // Lines of one paragraph may touch when the leading is tight; only different blocks clash.
      const blockA = a.owner.closest('p, h1, h2, h3, li, dt, dd, figcaption, blockquote, label, a, button') ?? a.owner
      const blockB = b.owner.closest('p, h1, h2, h3, li, dt, dd, figcaption, blockquote, label, a, button') ?? b.owner
      if (related(blockA, blockB) || !clash(a.rect, b.rect)) continue
      n++
      detail.push(`text overlaps text: “${(a.owner.textContent ?? '').trim().slice(0, 30)}”`)
    }
    for (const c of controls) {
      if (related(a.owner, c.owner) || !clash(a.rect, c.rect)) continue
      n++
      detail.push(`text overlaps a button or link: “${(a.owner.textContent ?? '').trim().slice(0, 30)}”`)
    }
  }
  return n
}

function overflow(root: HTMLElement, lines: readonly Box[], detail: string[]): number {
  const box = root.getBoundingClientRect()
  const outside = (r: DOMRect) => r.left < box.left - 2 || r.right > box.right + 2 || r.top < box.top - 2 || r.bottom > box.bottom + 2
  const controls = Array.from(root.querySelectorAll(CONTROLS)).filter(el => !el.closest(SKIP)).map(el => ({ rect: el.getBoundingClientRect(), owner: el }))
  const out = [...lines, ...controls].filter(x => visible(x.rect) && outside(x.rect))
  for (const x of out.slice(0, 3)) detail.push(`outside the section: “${(x.owner.textContent ?? '').trim().slice(0, 30)}”`)
  return out.length
}

export function layoutFaults(root: HTMLElement): Faults {
  const detail: string[] = []
  const lines = textLines(root)
  const { orphans, holes } = gridFaults(root, detail)
  return { orphans, holes, textOverlap: textOverlap(root, lines, detail), overflow: overflow(root, lines, detail), detail }
}
