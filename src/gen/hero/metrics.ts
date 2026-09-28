import type { SiteStyle } from '../schema'

export const HERO_TITLE_ID = 'sb-hero-title'

/** The frames the hard checks measure against. */
export const FRAME = {
  desktopWidth: 1200,
  /** Desktop heroes are designed for this height; taller means the content overflows. */
  desktopHeight: 640,
  phoneWidth: 375,
  /** Visible height of a small phone (iPhone SE class) once the browser bars are drawn. */
  phoneFold: 600,
  /** Room taken by the site header above the hero on a phone. */
  phoneHeader: 56,
  maxLinesDesktop: 3,
  maxLinesPhone: 5,
  minTap: 44,
  maxOverlap: 0.25,
} as const

/**
 * Spacing and type sizes derived from a style, shared by the renderer, the estimator and
 * the score. Upper-case display faces run wide, so their phone sizes are capped lower.
 */
export function heroSizes(style: SiteStyle) {
  const headline = Math.round(16 * style.headScale)
  const upper = style.displayUpper
  return {
    pad: Math.round(48 * style.density),
    gap: Math.round(16 * style.density),
    headline,
    headlineMobile: Math.min(Math.round(headline * 0.62), upper ? 36 : 44),
    /** Type-led heroes blow the headline up by their own scale. */
    typeled: (scale: number) => Math.min(Math.round(headline * scale), upper ? 112 : 128),
    typeledMobile: Math.min(Math.round(headline * 0.72), upper ? 40 : 52),
  }
}
