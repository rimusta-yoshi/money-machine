import { AA, contrastRatio, mix } from '../color'
import type { HeroSpec, SiteStyle, Tone } from '../schema'
import type { HeroMeasurement } from './measure'
import { FRAME } from './metrics'
import type { ButtonStyle } from '../schema'

export interface Check {
  id: 'headline-contrast' | 'body-contrast' | 'button-contrast' | 'tap-targets' | 'headline-fits' | 'fits-section'
    | 'fits-phone-width' | 'call-above-fold' | 'overlap' | 'content-gate'
  label: string
  ok: boolean
  detail: string
}

interface Surface { bg: string; fg: string; muted: string; link: string }

/** Forms can't use an underline "button": it doesn't read as a submit control. */
export const formButton = (b: ButtonStyle): ButtonStyle => (b === 'underline' ? 'solid' : b)

const WHITE = '#FFFFFF'
const FILLED = new Set(['solid', 'pill', 'offset'])

/** Worst case for text over a photo: a pure white photo under the scrim. */
const underScrim = (scrim: number) => mix(WHITE, '#000000', scrim)

function toneSurface(tone: Tone, style: SiteStyle): Surface {
  const p = style.palette
  if (tone === 'brand') return { bg: p.brandFill, fg: p.brandInk, muted: p.brandInk, link: p.brandInk }
  const bg = tone === 'surface' ? p.surface : p.ground
  return { bg, fg: p.ink, muted: p.muted, link: p.brandText }
}

const cardSurface = (bg: string, style: SiteStyle): Surface =>
  ({ bg, fg: style.palette.ink, muted: style.palette.muted, link: style.palette.brandText })

/** Every background text sits on in this hero, with the colours used on it. */
export function textSurfaces(spec: HeroSpec, style: SiteStyle): { main: Surface; cards: Surface[] } {
  const p = style.palette
  const cardBgFor = (tone: Tone) => (tone === 'ground' ? p.surface : p.ground)
  switch (spec.archetype) {
    case 'overlay': {
      const bg = underScrim(spec.params.scrim)
      return { main: { bg, fg: WHITE, muted: WHITE, link: WHITE }, cards: [] }
    }
    case 'card':
      return { main: cardSurface(spec.params.surface === 'surface' ? p.surface : p.ground, style), cards: [] }
    case 'offset':
      return { main: toneSurface('ground', style), cards: [] }
    case 'proof':
    case 'contact':
      return { main: toneSurface(spec.params.tone, style), cards: [cardSurface(cardBgFor(spec.params.tone), style)] }
    default:
      return { main: toneSurface(spec.params.tone, style), cards: [] }
  }
}

/** Contrast of a button label against whatever is behind it. */
function buttonContrast(button: string, s: Surface, style: SiteStyle): number {
  const p = style.palette
  if (FILLED.has(button)) return contrastRatio(p.brandFill, p.brandInk) // brand bands swap the pair; same ratio
  return contrastRatio(s.link, s.bg)
}

const ratio = (n: number) => `${n.toFixed(1)}:1`

/** Rules that need no layout: colour contrast. */
export function staticChecks(spec: HeroSpec, style: SiteStyle): Check[] {
  const { main, cards } = textSurfaces(spec, style)
  const all = [main, ...cards]
  const head = contrastRatio(main.fg, main.bg)
  const body = Math.min(...all.flatMap(s => [contrastRatio(s.muted, s.bg), contrastRatio(s.fg, s.bg)]))
  const buttons = [buttonContrast(style.button, main, style)]
  if (spec.archetype === 'contact') buttons.push(buttonContrast(formButton(style.button), cards[0], style))
  const btn = Math.min(...buttons)
  return [
    { id: 'headline-contrast', label: 'Headline contrast', ok: head >= AA, detail: `${ratio(head)}, needs 4.5:1` },
    { id: 'body-contrast', label: 'Body text contrast', ok: body >= AA, detail: `${ratio(body)}, needs 4.5:1` },
    { id: 'button-contrast', label: 'Button label contrast', ok: btn >= AA, detail: `${ratio(btn)}, needs 4.5:1` },
  ]
}

/** Rules that need a measurement: fit, tap targets, the call button above the fold. */
export function measuredChecks(spec: HeroSpec, m: HeroMeasurement): Check[] {
  const callBottom = FRAME.phoneHeader + m.phone.callBottomPx
  const checks: Check[] = [
    { id: 'tap-targets', label: 'Tap targets', ok: m.minTapPx >= FRAME.minTap, detail: `smallest ${Math.round(m.minTapPx)}px, needs ${FRAME.minTap}px` },
    {
      id: 'headline-fits',
      label: 'Headline fits',
      ok: m.desktop.headlineLines <= FRAME.maxLinesDesktop && m.phone.headlineLines <= FRAME.maxLinesPhone,
      detail: `${m.desktop.headlineLines} lines on desktop (max ${FRAME.maxLinesDesktop}), ${m.phone.headlineLines} on a phone (max ${FRAME.maxLinesPhone})`,
    },
    {
      id: 'fits-section',
      label: 'Fits the section',
      ok: m.desktop.heightPx <= FRAME.desktopHeight + 1,
      detail: `${Math.round(m.desktop.heightPx)}px tall, max ${FRAME.desktopHeight}px`,
    },
    {
      id: 'fits-phone-width',
      label: 'Fits a phone’s width',
      ok: !m.phone.overflowsWidth,
      detail: m.phone.overflowsWidth ? `something is wider than a ${FRAME.phoneWidth}px phone` : 'nothing wider than the screen',
    },
    {
      id: 'call-above-fold',
      label: 'Call button visible on a phone',
      ok: callBottom <= FRAME.phoneFold,
      detail: `bottom edge at ${Math.round(callBottom)}px, fold at ${FRAME.phoneFold}px`,
    },
  ]
  if (spec.archetype === 'offset') {
    const o = spec.params.overlap
    checks.push({ id: 'overlap', label: 'Photo overlap', ok: o <= FRAME.maxOverlap, detail: `${Math.round(o * 100)}% of headline width, max 25%` })
  }
  return checks
}
