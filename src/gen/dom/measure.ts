import { GEN_CSS } from '../page'
import { FRAME } from '../core/fit'
import type { Measurement, MeasureInput, Measurer } from '../core/types'
import { fontFileName, SITE_FONT_FILES, siteFontFaces } from '../fonts'
import type { SiteStyle } from '../schema'
import { layoutFaults } from './faults'

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

/** Computed style in the element's own document (sections are measured in a frame). */
export const styleOf = (el: Element): CSSStyleDeclaration => (el.ownerDocument.defaultView ?? window).getComputedStyle(el)

function lineCount(el: Element | null): number {
  if (!el) return 0
  const cs = styleOf(el)
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
  const pad = parseFloat(styleOf(section.querySelector('.sb-wrap') ?? section).paddingTop) || 0
  return fold.getBoundingClientRect().bottom - top + pad
}

/** Fonts and photos get this long to load before sections are measured anyway. */
export const PREPARE_MS = 4000

export interface DomMeasurer extends Measurer {
  /**
   * Loads a style's fonts, and any photos in `content`, where sections are measured, so
   * options are the same on every visit (a photo's shape can size its box). Never waits
   * longer than `timeoutMs`: resolves to false if something was still loading by then.
   */
  prepare(style: SiteStyle, content?: unknown, timeoutMs?: number): Promise<boolean>
  dispose(): void
}

/** Every photo URL in some content (data URLs and https links), wherever it sits. */
function photoUrls(content: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(content)) content.forEach(c => photoUrls(c, out))
  else if (content && typeof content === 'object') {
    for (const [k, v] of Object.entries(content)) {
      // Only photos ({ url, alt }): links in text are never fetched.
      if (k === 'url' && typeof v === 'string' && (v.startsWith('data:image/') || v.startsWith('https://'))) out.add(v)
      else photoUrls(v, out)
    }
  }
  return out
}

function dataUrlBlob(url: string): Blob | null {
  const m = /^data:(image\/[a-z+]+);base64,(.*)$/.exec(url)
  if (!m) return null
  const bin = atob(m[2])
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: m[1] })
}

/** Every self-hosted face a site style may use, as @font-face rules with absolute URLs. */
function allFontFaces(base: string): string {
  return Object.entries(SITE_FONT_FILES).flatMap(([family, faces]) => faces.map(face => {
    const [weight, italic] = face.split('-')
    const file = fontFileName({ family, weight: Number(weight), italic: italic === 'italic' })
    return `@font-face{font-family:'${family}';font-style:${italic ? 'italic' : 'normal'};font-weight:${weight};font-display:block;src:url('${base}/${file}') format('woff2')}`
  })).join('\n')
}

/**
 * Sections are measured in a hidden same-origin frame holding only what a published page
 * has (the generator's CSS and the site fonts), so the host page's own styles (the
 * builder's reset, the contact sheet's chrome) can never change a measurement. The
 * builder, the stress test and publishing all see the same layout.
 */
function measuringFrame(doc: Document): { frame: HTMLIFrameElement; inner: Document } {
  const frame = doc.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.tabIndex = -1
  frame.title = 'Layout measuring (hidden)'
  frame.style.cssText = 'position:absolute;left:-20000px;top:0;width:1600px;height:1200px;border:0;visibility:hidden;pointer-events:none;'
  doc.body.appendChild(frame)
  const inner = frame.contentDocument!
  const base = new URL('/fonts', doc.baseURI).href
  inner.open()
  inner.write(`<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><style>${allFontFaces(base)}
${GEN_CSS}
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}body{margin:0}</style></head><body class="sb-page"></body></html>`)
  inner.close()
  return { frame, inner }
}

export function createDomMeasurer(doc: Document): DomMeasurer {
  const { frame: iframe, inner } = measuringFrame(doc)
  const host = inner.body
  // Photos kept decoded in the frame, and data URLs swapped for short blob URLs so each
  // measurement parses a few KB of markup instead of megabytes of base64.
  const kept = inner.createElement('div')
  kept.hidden = true
  inner.documentElement.appendChild(kept)
  const blobs = new Map<string, string>()
  const loaded = new Set<string>()
  // Lazy images in an off-screen frame might never load; measuring copies load straight away.
  const short = (html: string) => (blobs.size ? html.replace(/src="(data:image\/[^"]+)"/g, (m, u: string) => (blobs.has(u) ? `src="${blobs.get(u)}"` : m)) : html)
    .replace(/loading="lazy"/g, 'loading="eager"')

  const frame = (width: number, html: string): HTMLElement => {
    const f = inner.createElement('div')
    f.style.width = `${width}px`
    // Ids are dropped so the measuring copies never clash with each other.
    f.innerHTML = html.replace(/\s(id|aria-labelledby|for)="[^"]*"/g, '')
    host.appendChild(f)
    return f.firstElementChild as HTMLElement
  }

  return {
    measure(input: MeasureInput): Measurement {
      const html = short(input.render())
      host.replaceChildren()
      const desk = frame(FRAME.desktopWidth, html)
      const phone = frame(FRAME.phoneWidth, html)
      // The call button, or failing that the first call to action (no phone number: the quote link).
      const call = phone.querySelector('[data-call]') ?? phone.querySelector('.sb-ctas .sb-btn, .sb-ctas a')
      const df = layoutFaults(desk)
      const pf = layoutFaults(phone)
      const result: Measurement = {
        desktop: { headlineLines: lineCount(visibleHeading(desk)), heightPx: firstView(desk) },
        phone: {
          headlineLines: lineCount(visibleHeading(phone)),
          callBottomPx: call ? call.getBoundingClientRect().bottom - phone.getBoundingClientRect().top : Infinity,
          overflowsWidth: overflowsWidth(phone),
        },
        minTapPx: Math.min(minTap(desk), minTap(phone)),
        coveredText: coveredText(desk) + coveredText(phone),
        faults: {
          orphans: df.orphans + pf.orphans,
          holes: df.holes + pf.holes,
          textOverlap: df.textOverlap + pf.textOverlap,
          overflow: df.overflow + pf.overflow,
          detail: [...(df.detail ?? []).map(d => `desktop: ${d}`), ...(pf.detail ?? []).map(d => `phone: ${d}`)],
        },
      }
      host.replaceChildren()
      return result
    },
    prepare: async (style, content, timeoutMs = PREPARE_MS) => {
      const loads: Promise<unknown>[] = [loadStyleFonts(inner, style)]
      for (const url of photoUrls(content)) {
        if (loaded.has(url)) continue
        loaded.add(url)
        let src = url
        if (url.startsWith('data:')) {
          let blob: Blob | null = null
          try {
            blob = dataUrlBlob(url)
          } catch {
            // Not valid base64: measured with the original URL instead.
          }
          if (blob) {
            src = URL.createObjectURL(blob)
            blobs.set(url, src)
          }
        }
        const im = inner.createElement('img')
        im.src = src
        kept.appendChild(im)
        loads.push(im.decode().catch(() => undefined))
      }
      let timer: ReturnType<typeof setTimeout> | undefined
      const late = new Promise<false>(resolve => { timer = setTimeout(() => resolve(false), timeoutMs) })
      const ready = await Promise.race([Promise.all(loads).then(() => true), late])
      clearTimeout(timer)
      if (!ready) console.warn('Fonts or photos are slow to load; measuring without waiting for them')
      return ready
    },
    dispose: () => {
      for (const u of blobs.values()) URL.revokeObjectURL(u)
      iframe.remove()
    },
  }
}
