import { HERO_CSS } from '../hero/css'
import type { HeroMeasurement, MeasureInput, Measurer } from '../hero/measure'
import { FRAME } from '../hero/metrics'
import type { SiteStyle } from '../schema'

/**
 * The generator's only DOM code: lays a hero out off-screen at desktop and phone width
 * and reads back the numbers the hard checks need. Browser only, generation time only.
 */

const STYLE_ID = 'sb-gen-css'
const TAPPABLE = 'a[href], button, input, textarea, select'

/** Adds the generator stylesheet to a document once. */
export function ensureGenStyles(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return
  const el = doc.createElement('style')
  el.id = STYLE_ID
  el.textContent = HERO_CSS
  doc.head.appendChild(el)
}

/** Waits for a style's fonts so measurements (and so the options) are the same on every visit. */
export async function loadStyleFonts(doc: Document, style: SiteStyle): Promise<void> {
  if (!doc.fonts) return
  const specs = [
    `${style.display.weight} 40px '${style.display.family}'`,
    `${style.body.weight} 17px '${style.body.family}'`,
    `700 17px '${style.body.family}'`,
    `600 17px '${style.body.family}'`,
  ]
  await Promise.all(specs.map(s => doc.fonts.load(s).catch(() => [])))
  await doc.fonts.ready
}

function lineCount(el: Element): number {
  const cs = getComputedStyle(el)
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.06
  return Math.max(1, Math.round(el.getBoundingClientRect().height / lh))
}

/** The hero clips overflow, so compare each block's content width with its box. */
const overflowsWidth = (root: HTMLElement): boolean =>
  [root, ...Array.from(root.querySelectorAll<HTMLElement>('.sb-in, .sb-text, .sb-h1, .sb-btn, .sb-link, .sb-card'))]
    .some(el => el.scrollWidth > el.clientWidth + 1)

const minTap = (root: Element): number =>
  Math.min(...Array.from(root.querySelectorAll(TAPPABLE)).map(el => el.getBoundingClientRect().height))

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
    // Ids are dropped so the measuring copies never clash with the visible hero.
    f.innerHTML = html.replace(/\s(id|aria-labelledby|for)="[^"]*"/g, '')
    host.appendChild(f)
    return f.firstElementChild as HTMLElement
  }

  return {
    measure({ html }: MeasureInput): HeroMeasurement {
      host.replaceChildren()
      const desk = frame(FRAME.desktopWidth, html)
      const phone = frame(FRAME.phoneWidth, html)
      const call = phone.querySelector('[data-call]')
      const result: HeroMeasurement = {
        desktop: { headlineLines: lineCount(desk.querySelector('.sb-h1')!), heightPx: desk.getBoundingClientRect().height },
        phone: {
          headlineLines: lineCount(phone.querySelector('.sb-h1')!),
          callBottomPx: call ? call.getBoundingClientRect().bottom - phone.getBoundingClientRect().top : Infinity,
          overflowsWidth: overflowsWidth(phone),
        },
        minTapPx: Math.min(minTap(desk), minTap(phone)),
      }
      host.replaceChildren()
      return result
    },
    dispose: () => host.remove(),
  }
}
