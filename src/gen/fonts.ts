import type { SiteStyle } from './schema'

/**
 * Self-hosted font files a generated site can use: family -> faces. Files are
 * `<slug>-<weight>[-italic].woff2` under a base path (public/fonts in this app, copied
 * from Fontsource by scripts/copy-fonts.mjs). No third-party requests.
 */
export const SITE_FONT_FILES: Readonly<Record<string, readonly string[]>> = {
  'Anton': ['400'],
  'Barlow': ['400', '500', '600', '700'],
  'Barlow Condensed': ['600', '700'],
  'Schibsted Grotesk': ['700', '800'],
  'Instrument Sans': ['400', '500', '600', '700'],
  'Fraunces': ['400', '400-italic', '600'],
  'Libre Franklin': ['400', '500', '600', '700'],
  'Bricolage Grotesque': ['700', '800'],
  'Nunito Sans': ['400', '600', '700', '800'],
}

export interface FontFace { family: string; weight: number; italic?: boolean }

const faceKey = (f: FontFace) => `${f.weight}${f.italic ? '-italic' : ''}`

export const fontFileName = (f: FontFace): string =>
  `${f.family.toLowerCase().replace(/ /g, '-')}-${faceKey(f)}.woff2`

/**
 * The faces a site style needs: display at its weight (and its italic, for emphasis),
 * the label face, and body at text, 600, 700 and 800 (labels, buttons, stickers).
 */
export function siteFontFaces(style: SiteStyle): FontFace[] {
  const { display: d, body: b, label: l } = style.fonts
  const wanted: FontFace[] = [
    { family: d.family, weight: d.weight },
    { family: d.family, weight: d.weight, italic: true },
    { family: d.family, weight: 800 },
    { family: l.family, weight: l.weight },
    { family: l.family, weight: 600 },
    ...[b.weight, 500, 600, 700, 800].map(weight => ({ family: b.family, weight })),
  ]
  const seen = new Set<string>()
  // Faces with no file (e.g. Anton 800) are left to the browser's nearest match.
  return wanted.filter(f => {
    const key = fontFileName(f)
    if (seen.has(key) || !SITE_FONT_FILES[f.family]?.includes(faceKey(f))) return false
    seen.add(key)
    return true
  })
}

/** @font-face rules for a published page, pointing at self-hosted files under `base`. */
export function fontFaceCss(style: SiteStyle, base = '/fonts'): string {
  const root = base.replace(/\/+$/, '')
  return siteFontFaces(style)
    .map(f => `@font-face{font-family:'${f.family}';font-style:${f.italic ? 'italic' : 'normal'};font-weight:${f.weight};font-display:swap;src:url('${root}/${fontFileName(f)}') format('woff2')}`)
    .join('\n')
}
