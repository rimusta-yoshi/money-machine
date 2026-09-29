import { GEN_CSS } from '../page'
import { FRAME } from '../core/fit'
import type { Measurement, MeasureInput, Measurer } from '../core/types'
import { siteFontFaces } from '../fonts'
import type { SiteStyle } from '../schema'

/**
 * The generator's only DOM code: lays a section out off-screen at desktop and phone width
 * and reads back the numbers the hard checks need. Browser only, generation time only.
 */

const STYLE_ID = 'sb-gen-css'
const TAPPABLE = 'a[href], button, input, textarea, select'

/** Adds the generator stylesheet to a document once. */
export function ensureGenStyles(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return
  const el = doc.createElement('style')
  el.id = STYLE_ID
  el.textContent = GEN_CSS
  doc.head.appendChild(el)
}

/** Waits for a style's fonts so measurements (and so the options) are the same on every visit. */
export async function loadStyleFonts(doc: Document, style: SiteStyle): Promise<void> {
  if (!doc.fonts) return
  const specs = siteFontFaces(style).map(f => `${f.italic ? 'italic ' : ''}${f.weight} 40px '${f.family}'`)
  await Promise.all(specs.map(s => doc.fonts.load(s).catch(() => [])))
  await doc.fonts.ready
}

function lineCount(el: Element | null): number {
  if (!el) return 0
  const cs = getComputedStyle(el)
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.06
  return Math.max(1, Math.round(el.getBoundingClientRect().height / lh))
}

const BLOCKS = '.sb-hero-text, .sb-wrap, .sb-main, .sb-aside, .sb-h1, .sb-h2, .sb-h3, .sb-btn, .sb-link, .sb-card, .sb-chip, li, p, dl'

/**
 * Sections may clip overflow, so compare each block's content width with its box.
 * Deliberate sideways scrollers ([data-scroll]) and screen-reader-only text are skipped.
 */
const overflowsWidth = (root: HTMLElement): boolean =>
  [root, ...Array.from(root.querySelectorAll<HTMLElement>(BLOCKS))]
    .filter(el => !el.closest('[data-scroll], .sb-sr, [data-over]'))
    .some(el => el.scrollWidth > el.clientWidth + 1)

const HEADING = '.sb-h1, [data-heading]'

/** The visible heading; one kept only for screen readers (.sb-sr) doesn't take up lines. */
const visibleHeading = (root: Element): Element | null =>
  Array.from(root.querySelectorAll(HEADING)).find(h => !h.closest('.sb-sr')) ?? null

const minTap = (root: Element): number =>
  Math.min(...Array.from(root.querySelectorAll(TAPPABLE)).map(el => el.getBoundingClientRect().height))

const overlaps = (a: DOMRect, b: DOMRect, slack = 1): boolean =>
  a.left < b.right - slack && b.left < a.right - slack && a.top < b.bottom - slack && b.top < a.bottom - slack

/**
 * How many overlapping or rotated decorations ([data-over]: stickers, floating cards,
 * stripes) sit on any visible text or button outside themselves. Text is measured line by
 * line from its text nodes, so a decoration in the empty part of a paragraph box is fine.
 */
function coveredText(root: HTMLElement): number {
  const overs = Array.from(root.querySelectorAll<HTMLElement>('[data-over]'))
  if (!overs.length) return 0
  const doc = root.ownerDocument
  const rects: DOMRect[] = []
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const node = walker.currentNode
    const el = node.parentElement
    if (!node.textContent?.trim() || !el || el.closest('[data-over], .sb-sr')) continue
    const range = doc.createRange()
    range.selectNodeContents(node)
    rects.push(...Array.from(range.getClientRects()))
  }
  root.querySelectorAll('[data-call], .sb-btn, input, textarea').forEach(el => {
    if (!el.closest('[data-over]')) rects.push(el.getBoundingClientRect())
  })
  return overs.filter(o => {
    const box = o.getBoundingClientRect()
    return rects.some(r => r.width > 0 && r.height > 0 && overlaps(box, r))
  }).length
}

/**
 * The height the first screen must hold: the whole section, or, for layouts whose photo is a
 * trailing figure meant to run on below the fold, down to the end of the part marked data-fold.
 */
function firstView(section: HTMLElement): number {
  const top = section.getBoundingClientRect().top
  const fold = section.querySelector('[data-fold]')
  if (!fold) return section.getBoundingClientRect().height
  const pad = parseFloat(getComputedStyle(section.querySelector('.sb-wrap') ?? section).paddingTop) || 0
  return fold.getBoundingClientRect().bottom - top + pad
}

export interface DomMeasurer extends Measurer {
  dispose(): void
}

export function createDomMeasurer(doc: Document): DomMeasurer {
  ensureGenStyles(doc)
  const host = doc.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.setAttribute('inert', '')
  host.style.cssText = 'position:absolute;left:-20000px;top:0;visibility:hidden;pointer-events:none;'
  doc.body.appendChild(host)

  const frame = (width: number, html: string): HTMLElement => {
    const f = doc.createElement('div')
    f.style.width = `${width}px`
    // Ids are dropped so the measuring copies never clash with the visible page.
    f.innerHTML = html.replace(/\s(id|aria-labelledby|for)="[^"]*"/g, '')
    host.appendChild(f)
    return f.firstElementChild as HTMLElement
  }

  return {
    measure(input: MeasureInput): Measurement {
      const html = input.render()
      host.replaceChildren()
      const desk = frame(FRAME.desktopWidth, html)
      const phone = frame(FRAME.phoneWidth, html)
      const call = phone.querySelector('[data-call]')
      const result: Measurement = {
        desktop: { headlineLines: lineCount(visibleHeading(desk)), heightPx: firstView(desk) },
        phone: {
          headlineLines: lineCount(visibleHeading(phone)),
          callBottomPx: call ? call.getBoundingClientRect().bottom - phone.getBoundingClientRect().top : Infinity,
          overflowsWidth: overflowsWidth(phone),
        },
        minTapPx: Math.min(minTap(desk), minTap(phone)),
        coveredText: coveredText(desk) + coveredText(phone),
      }
      host.replaceChildren()
      return result
    },
    dispose: () => host.remove(),
  }
}
