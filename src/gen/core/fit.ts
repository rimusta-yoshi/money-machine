import { FRAME, heroSizes } from '../hero/metrics'
import type { SiteStyle } from '../schema'
import type { Check, Measurement } from './types'

/** Sizes for non-hero sections, derived from the same style numbers as the hero. */
export function sectionSizes(style: SiteStyle) {
  const z = heroSizes(style)
  return {
    ...z,
    h2: Math.min(Math.round(z.headline * 0.62), 48),
    h2Mobile: Math.min(Math.round(z.headline * 0.48), style.displayUpper ? 28 : 32),
    py: Math.round(80 * style.density),
  }
}

export const sectionVars = (style: SiteStyle): string => {
  const s = sectionSizes(style)
  return `--sb-h2:${s.h2}px;--sb-h2-m:${s.h2Mobile}px;--sb-py:${s.py}px;`
}

export const MAX_HEADING_LINES = { desktop: 3, phone: 4 }

/** Hard rules every non-hero section must pass once laid out. */
export function sectionMeasuredChecks(m: Measurement): Check[] {
  return [
    { id: 'tap-targets', label: 'Tap targets', ok: m.minTapPx >= FRAME.minTap, detail: `smallest ${Math.round(m.minTapPx)}px, needs ${FRAME.minTap}px` },
    {
      id: 'heading-fits',
      label: 'Heading fits',
      ok: m.desktop.headlineLines <= MAX_HEADING_LINES.desktop && m.phone.headlineLines <= MAX_HEADING_LINES.phone,
      detail: `${m.desktop.headlineLines} lines on desktop (max ${MAX_HEADING_LINES.desktop}), ${m.phone.headlineLines} on a phone (max ${MAX_HEADING_LINES.phone})`,
    },
    {
      id: 'fits-phone-width',
      label: 'Fits a phone’s width',
      ok: !m.phone.overflowsWidth,
      detail: m.phone.overflowsWidth ? `something is wider than a ${FRAME.phoneWidth}px phone` : 'nothing wider than the screen',
    },
  ]
}

const GLYPH = { 'sans-serif': 0.55, serif: 0.5, monospace: 0.62 } as const

/** Pessimistic line count from average glyph widths. */
export function estLines(text: string, fontPx: number, widthPx: number, style: SiteStyle, display = true): number {
  if (!text) return 0
  const face = display ? style.display : style.body
  const em = GLYPH[face.fallback] * (display && style.displayUpper ? 1.2 : 1) * (face.weight >= 800 ? 1.08 : 1)
  return Math.max(1, Math.ceil((text.length * fontPx * em) / (widthPx * 0.85)))
}

const longestWord = (s: string) => Math.max(0, ...s.split(/\s+/).map(w => w.length))

/**
 * A layout estimate for a section without a DOM: its heading's lines at both widths, and
 * whether any single word is too wide for a phone. Height isn't limited for these sections.
 */
export function estimateSection(style: SiteStyle, title: string, texts: readonly string[], headingWidthDesktop = 720): Measurement {
  const z = sectionSizes(style)
  const phoneWidth = FRAME.phoneWidth - 40
  const widest = Math.max(longestWord(title) * z.h2Mobile * 0.62, ...texts.map(t => longestWord(t) * 17 * 0.62))
  return {
    desktop: { headlineLines: estLines(title, z.h2, headingWidthDesktop, style), heightPx: 0 },
    phone: { headlineLines: estLines(title, z.h2Mobile, phoneWidth, style), callBottomPx: Infinity, overflowsWidth: widest > phoneWidth },
    minTapPx: Math.min(style.buttonHeight, FRAME.minTap),
  }
}
