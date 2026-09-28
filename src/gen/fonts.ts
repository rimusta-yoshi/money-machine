import type { SiteStyle } from './schema'

/**
 * Self-hosted font files a generated site can use: family -> available weights.
 * Files are `<slug>-<weight>.woff2` under a base path (public/fonts in this app,
 * copied from Fontsource by scripts/copy-fonts.mjs). No third-party requests.
 */
export const SITE_FONT_FILES: Readonly<Record<string, readonly number[]>> = {
  'Manrope': [600, 700, 800],
  'Source Sans 3': [400, 600, 700],
  'Source Serif 4': [700],
  'Cormorant Garamond': [600],
  'Bodoni Moda': [500],
  'Jost': [400, 600, 700],
  'Nunito': [800],
  'Nunito Sans': [400, 600, 700],
  'Fraunces': [700],
  'Archivo': [900],
  'Space Mono': [400, 700],
}

export interface FontFace { family: string; weight: number }

export const fontFileName = ({ family, weight }: FontFace): string =>
  `${family.toLowerCase().replace(/ /g, '-')}-${weight}.woff2`

/** The faces a site style needs: display at its weight; body at text, 600 (labels) and 700 (buttons). */
export function siteFontFaces(style: SiteStyle): FontFace[] {
  const wanted: FontFace[] = [
    { family: style.display.family, weight: style.display.weight },
    ...[style.body.weight, 600, 700].map(weight => ({ family: style.body.family, weight })),
  ]
  const seen = new Set<string>()
  // Weights with no file (e.g. Space Mono 600) are left to the browser's nearest-weight match.
  return wanted.filter(f => {
    const key = fontFileName(f)
    if (seen.has(key) || !SITE_FONT_FILES[f.family]?.includes(f.weight)) return false
    seen.add(key)
    return true
  })
}

/** @font-face rules for a published page, pointing at self-hosted files under `base`. */
export function fontFaceCss(style: SiteStyle, base = '/fonts'): string {
  const root = base.replace(/\/+$/, '')
  return siteFontFaces(style)
    .map(f => `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${f.weight};font-display:swap;src:url('${root}/${fontFileName(f)}') format('woff2')}`)
    .join('\n')
}
