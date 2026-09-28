import type { HeroSpec, SiteStyle } from '../schema'
import type { HeroContent } from './content'
import type { HeroMeasurement, MeasureInput, Measurer } from './measure'
import { FRAME, heroSizes } from './metrics'

/**
 * A layout estimate from average glyph widths, for places without a DOM (tests, a Worker
 * picking a default hero). Deliberately pessimistic; the browser measurer is the real thing.
 */
export const estimateMeasurer: Measurer = { measure: estimate }

const GLYPH: Record<SiteStyle['display']['fallback'], number> = { 'sans-serif': 0.55, serif: 0.5, monospace: 0.62 }

function lines(text: string, fontPx: number, widthPx: number, face: SiteStyle['display'], upper: boolean): number {
  if (!text) return 0
  const em = GLYPH[face.fallback] * (upper ? 1.2 : 1) * (face.weight >= 800 ? 1.08 : 1)
  // Word wrapping wastes some of each line; 0.85 keeps the estimate on the safe side.
  return Math.max(1, Math.ceil((text.length * fontPx * em) / (widthPx * 0.85)))
}

const longestWord = (s: string) => Math.max(0, ...s.split(/\s+/).map(w => w.length))

function textColumn(spec: HeroSpec, inner: number, gap: number, pad: number): number {
  const cols = inner - gap * 2.5
  switch (spec.archetype) {
    case 'split': return cols * spec.params.ratio
    case 'overlay': return Math.min(spec.params.anchor === 'center' ? 860 : 720, inner)
    case 'stacked': return Math.min(880, inner)
    case 'card': return Math.min(560, inner) - gap * 4
    case 'offset': return (FRAME.desktopWidth / 2 - 2 * pad) / (1 - spec.params.overlap)
    case 'typeled': return inner
    case 'proof': return (cols * 1.1) / 2.1
    case 'contact': return (cols * 1.25) / 2
  }
}

function headlinePx(spec: HeroSpec, style: SiteStyle, phone: boolean): number {
  const z = heroSizes(style)
  if (spec.archetype === 'typeled') return phone ? z.typeledMobile : z.typeled(spec.params.scale)
  if (phone) return z.headlineMobile
  return spec.archetype === 'card' ? z.headline * 0.8 : z.headline
}

function estimate({ spec, style, content: c }: MeasureInput): HeroMeasurement {
  const { pad, gap } = heroSizes(style)
  const upper = style.displayUpper
  const bh = style.buttonHeight

  // Desktop
  const col = textColumn(spec, FRAME.desktopWidth - 2 * pad, gap, pad)
  const hd = headlinePx(spec, style, false)
  const hLines = lines(c.headline, hd, col, style.display, upper)
  const subLines = lines(c.sub, 18, Math.min(col, 18 * 0.55 * 58), style.body, false)
  const extras = (c.rating ? 28 + gap : 0)
  const stack = hLines * hd * 1.06 + gap + subLines * 27 + gap * 1.5 + bh + extras
  const reviewH = (r: HeroContent['reviews'][number]) => lines(r.text, 16, (FRAME.desktopWidth - 2 * pad) / 2.1, style.body, false) * 23 + 30 + gap * 2.2
  const form = (n: number) => 28 + n * (22 + 48 + gap * 0.75) + bh + gap * 3
  const content = ((): number => {
    switch (spec.archetype) {
      case 'split': return Math.max(stack, 420) + (spec.params.proof === 'strip' ? gap * 3 + 30 : 0)
      case 'stacked': return stack + (spec.params.image === 'none' ? 0 : gap * 2 + 160)
      case 'card': return stack + gap * 4
      case 'typeled': return hLines * hd * 1.06 + Math.max(subLines * 27, bh) + (spec.params.trust ? 50 : 0) + gap * 4
      case 'proof': {
        const cards = c.reviews.slice(0, spec.params.count).reduce((h, r) => h + reviewH(r) + gap, 0)
        return Math.max(stack + (spec.params.team ? 110 + gap : 0), cards + (spec.params.summary === 'none' ? 0 : 56 + gap))
      }
      case 'contact': return Math.max(stack, form(spec.params.fields))
      default: return stack
    }
  })()

  // Phone
  const inner = FRAME.phoneWidth - 40
  const hp = headlinePx(spec, style, true)
  const pLines = lines(c.headline, hp, inner, style.display, upper)
  const pSub = lines(c.sub, 16, inner, style.body, false)
  const pGap = gap * 1.4
  const textTop = ((): number => {
    switch (spec.archetype) {
      case 'overlay': return 140
      case 'card': return 220 - 56 + 22
      case 'offset': return 28 + 220 + pGap
      case 'split': return 28 + (spec.params.mobilePhoto === 'top' ? 220 + pGap : 0)
      default: return 28
    }
  })()
  const callBottom = textTop + pLines * hp * 1.06 + gap + pSub * 24 + gap * 1.5 + (spec.archetype === 'typeled' ? pGap : 0) + bh

  return {
    desktop: { headlineLines: hLines, heightPx: Math.max(FRAME.desktopHeight, content + 2 * pad) },
    phone: { headlineLines: pLines, callBottomPx: callBottom, overflowsWidth: longestWord(c.headline) * hp * 0.62 > inner },
    minTapPx: Math.min(bh, 44),
  }
}
