import { displayEm, estLines, FRAME, tooWide } from '../core/fit'
import type { Measurement } from '../core/types'
import type { SiteStyle } from '../schema'
import { THEMES } from '../themes'
import { sizesFor, spacing } from '../themes/sizes'
import type { HeroSpec } from '../sections/hero'
import type { HeroContent } from './content'

const BODY_EM = 0.52
const RATIO: Record<string, number> = { '4:5': 1.25, '1:1': 1, '4:3': 0.75, '3:2': 0.667 }

/**
 * A hero layout estimate from average glyph widths, for places without a DOM.
 * Deliberately pessimistic; the browser measurer is the real thing.
 */
export function estimateHero(spec: HeroSpec, style: SiteStyle, c: HeroContent): Measurement {
  const z = sizesFor(style, spec.step)
  const s = spacing(style)
  const t = THEMES[style.theme]
  const em = displayEm(style)
  const lh = t.display.leading
  const inner = FRAME.desktopWidth - 2 * s.pad
  const colGap = s.gap * 2.5
  const gap = s.gap * 1.6
  const colW = (inner - 11 * colGap) / 12
  const span = (n: number) => colW * n + colGap * (n - 1)
  const btn = 60
  const p = spec.params as Record<string, unknown>
  const ta = typeof p.asym === 'string' ? Number(p.asym.split('/')[0]) : 6
  const bigphone = spec.archetype === 'bigphone'

  /* ---- desktop ---- */
  const col = ((): number => {
    switch (spec.archetype) {
      case 'split': case 'floatcard': case 'sticker': return span(ta)
      case 'overlay': return Math.min(p.anchor === 'center' ? 900 : 780, inner)
      case 'stacked': return Math.min(980, inner)
      case 'typeled': return Math.min(14 * z.h1, inner)
      case 'proof': case 'contact': return span(7)
      case 'offset': return inner * 0.54 * (1 / (1 - (p.overlap as number)))
      case 'bigphone': return p.photo ? span(8) : inner
      case 'editorial': return Math.min(960, inner)
    }
  })()
  const hpx = bigphone ? z.h2 : z.h1
  const hLines = estLines(c.headline, hpx, col, em)
  const subLines = estLines(c.sub, z.lead, Math.min(col, 32 * z.lead * 0.9), BODY_EM)
  const eyebrow = estLines(c.eyebrow, 18, col, 0.62) * 24
  const proofUnder = spec.archetype === 'split' && p.proof === 'under' ? 44 + gap : 0
  const ticksH = (p.motif === 'ticks' || p.ticks === true) && c.badges.length ? 28 + gap : 0
  const phoneBlock = bigphone ? 24 + z.h1 * 0.9 + gap + btn : btn
  const stack = eyebrow + gap + hLines * hpx * lh + gap + subLines * z.lead * 1.55 + gap + phoneBlock + proofUnder + ticksH
  const photoH = (w: number, crop: unknown) => Math.min(w * (RATIO[String(crop)] ?? 1), 560)
  const reviewH = (text: string) => estLines(text, 16, span(5) - 48, BODY_EM) * 24 + 44 + 30
  const formH = (n: number) => 28 + 32 + n * (26 + 52 + gap * 0.9) + btn + 56

  const content = ((): number => {
    switch (spec.archetype) {
      case 'split': return Math.max(stack, p.bleed === 'edge' ? 560 : photoH(span(12 - ta), p.crop)) + (p.proof === 'strip' ? gap * 2 + 40 : 0)
      case 'floatcard': return Math.max(stack, photoH(span(12 - ta), p.crop))
      case 'sticker': return Math.max(stack, photoH(span(12 - ta) * 0.9, p.crop) * 1.1)
      case 'stacked': return stack + (p.image === 'none' ? 0 : s.gap * 2.75 + 300)
      case 'typeled': return stack + (p.trust ? 56 : 0) + (p.motif === 'stripe' ? 12 + gap : 0)
      case 'proof': {
        const cards = c.reviews.slice(0, p.count as number).reduce((h, x) => h + reviewH(x.text) + s.gap, 0)
        return Math.max(stack, cards + (p.summary === 'none' ? 0 : z.xl + s.gap))
      }
      case 'contact': return Math.max(stack + (c.rating ? 30 + gap : 0), formH(p.fields as number))
      case 'bigphone': return Math.max(stack, p.photo ? photoH(span(4), p.crop) : 0)
      case 'editorial': return stack + (p.image === 'figure' ? s.gap * 2.75 + 440 + 36 : 24)
      default: return stack + (c.rating ? 30 + gap : 0)
    }
  })()
  const minH = spec.archetype === 'overlay' ? 680 : 640
  const heightPx = Math.max(minH, content + s.py * 1.5)

  /* ---- phone ---- */
  const pw = FRAME.phoneWidth - 40
  const hp = bigphone ? z.h2m : z.h1m
  const g = s.gap * 1.1
  const pLines = estLines(c.headline, hp, pw, em)
  const pSub = estLines(c.sub, 17, pw, BODY_EM)
  const pEyebrow = estLines(c.eyebrow, 18, pw, 0.62) * 24
  const phonePhoto = (crop: unknown) => Math.min(pw * (RATIO[String(crop)] ?? 1), 240)
  const top = ((): number => {
    switch (spec.archetype) {
      case 'overlay': return 150
      case 'split': return 24 + (p.mphoto === 'top' ? phonePhoto(p.crop) + s.gap * 1.8 : 0)
      case 'offset': return 24 + 220 + s.gap * 1.8
      default: return 24
    }
  })()
  const callBlock = bigphone ? 24 + z.xlm * 0.9 : btn
  const callBottom = top + pEyebrow + g + pLines * hp * lh + g + pSub * 17 * 1.55 + g + callBlock
  const number = bigphone && c.call ? c.call.number.replace(/\s/g, 'x') : ''

  return {
    desktop: { headlineLines: hLines, heightPx },
    phone: {
      headlineLines: pLines,
      callBottomPx: c.call || c.quote ? callBottom : Infinity,
      overflowsWidth: tooWide([c.headline], hp, em, pw) || (bigphone && number.length * z.xlm * em > pw),
    },
    minTapPx: FRAME.minTap,
    coveredText: 0,
  }
}
