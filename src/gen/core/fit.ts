import type { SiteStyle } from '../schema'
import { THEMES } from '../themes'
import { sizesFor, spacing } from '../themes/sizes'
import type { Check, Measurement, Step } from './types'

/** The frames the hard checks measure against. */
export const FRAME = {
  desktopWidth: 1200,
  /** Desktop heroes are designed for this height; taller means the content overflows. */
  desktopHeight: 720,
  phoneWidth: 375,
  /** Visible height of a small phone (iPhone SE class) once the browser bars are drawn. */
  phoneFold: 600,
  /** Room taken by the site header above the hero on a phone. */
  phoneHeader: 64,
  maxLinesDesktop: 3,
  maxLinesPhone: 5,
  minTap: 44,
} as const

export const MAX_HEADING_LINES = { desktop: 3, phone: 4 }

const tapCheck = (m: Measurement): Check =>
  ({ id: 'tap-targets', label: 'Tap targets', ok: m.minTapPx >= FRAME.minTap, detail: `smallest ${Math.round(m.minTapPx)}px, needs ${FRAME.minTap}px` })

const widthCheck = (m: Measurement): Check => ({
  id: 'fits-phone-width',
  label: 'Fits a phone’s width',
  ok: !m.phone.overflowsWidth,
  detail: m.phone.overflowsWidth ? `something is wider than a ${FRAME.phoneWidth}px phone` : 'nothing wider than the screen',
})

/** Overlapping and rotated decorations may be bold, but never sit on text or the call button. */
export const coverCheck = (m: Measurement): Check => ({
  id: 'no-covered-text',
  label: 'Decorations clear of text',
  ok: m.coveredText === 0,
  detail: m.coveredText === 0 ? 'no sticker, card or stripe covers any text' : `${m.coveredText} overlap${m.coveredText > 1 ? 's' : ''} with text or the call button`,
})

/** Hard rules every non-hero section must pass once laid out. */
export function sectionMeasuredChecks(m: Measurement): Check[] {
  return [
    tapCheck(m),
    {
      id: 'heading-fits',
      label: 'Heading fits',
      ok: m.desktop.headlineLines <= MAX_HEADING_LINES.desktop && m.phone.headlineLines <= MAX_HEADING_LINES.phone,
      detail: `${m.desktop.headlineLines} lines on desktop (max ${MAX_HEADING_LINES.desktop}), ${m.phone.headlineLines} on a phone (max ${MAX_HEADING_LINES.phone})`,
    },
    widthCheck(m),
    coverCheck(m),
  ]
}

/** The hero's rules: headline lines, height, phone width, the call button above the fold, clear decorations. */
export function heroMeasuredChecks(m: Measurement): Check[] {
  const callBottom = FRAME.phoneHeader + m.phone.callBottomPx
  return [
    tapCheck(m),
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
    widthCheck(m),
    {
      id: 'call-above-fold',
      label: 'Call button visible on a phone',
      ok: callBottom <= FRAME.phoneFold,
      detail: `bottom edge at ${Math.round(callBottom)}px, fold at ${FRAME.phoneFold}px`,
    },
    coverCheck(m),
  ]
}

/* ---------- the estimator: pessimistic layout guesses for places without a DOM ---------- */

/** Average glyph width in em for each display face (upper-case where the theme sets it so). */
const GLYPH: Record<string, number> = {
  'Anton': 0.5,
  'Schibsted Grotesk': 0.56,
  'Fraunces': 0.52,
  'Bricolage Grotesque': 0.58,
}

/** Average glyph width, in em, of the style's display face as the theme sets it. */
export const displayEm = (style: SiteStyle): number => GLYPH[style.fonts.display.family] ?? 0.58

/** Pessimistic line count from average glyph widths. */
export function estLines(text: string, fontPx: number, widthPx: number, em: number): number {
  if (!text) return 0
  // Word wrapping wastes some of each line; 0.85 keeps the estimate on the safe side.
  return Math.max(1, Math.ceil((text.length * fontPx * em) / (widthPx * 0.85)))
}

const longestWord = (s: string) => Math.max(0, ...s.split(/\s+/).map(w => w.length))

/** Whether a word in any of the texts is too long for a phone at this size. */
export const tooWide = (texts: readonly string[], px: number, em: number, width: number): boolean =>
  texts.some(t => longestWord(t) * px * em > width)

/**
 * A layout estimate for a section without a DOM: its heading's lines at both widths, and
 * whether any single word is too wide for a phone. Height isn't limited for these sections.
 * `desktopCol` is the heading's column width on a 1200px page.
 */
export function estimateSection(style: SiteStyle, step: Step, title: string, texts: readonly string[], desktopCol = 760, px?: { d: number; m: number }): Measurement {
  const z0 = sizesFor(style, step)
  const z = px ? { ...z0, h2: px.d, h2m: px.m } : z0
  const s = spacing(style)
  const em = displayEm(style)
  const phoneWidth = FRAME.phoneWidth - 40
  const col = Math.min(desktopCol, FRAME.desktopWidth - 2 * s.pad)
  const upperLabel = THEMES[style.theme].caps.upper
  return {
    desktop: { headlineLines: estLines(title, z.h2, col, em), heightPx: 0 },
    phone: {
      headlineLines: estLines(title, z.h2m, phoneWidth, em),
      callBottomPx: Infinity,
      overflowsWidth: tooWide([title], z.h2m, em, phoneWidth) || tooWide(texts, upperLabel ? 20 : 18, 0.62, phoneWidth - 40),
    },
    minTapPx: FRAME.minTap,
    coveredText: 0,
  }
}
