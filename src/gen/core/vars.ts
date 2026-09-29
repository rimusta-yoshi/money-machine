import { contrastRatio } from '../color'
import { PHOTO_WORST } from './contrast'
import { THEMES } from '../themes'
import { sizesFor, spacing } from '../themes/sizes'
import type { SiteStyle } from '../schema'
import type { Step } from './types'

const quote = (family: string) => (/\s/.test(family) ? `'${family}'` : family)

/** CSS font-family value for a face. Families are schema-checked, so this is safe in a style attribute. */
export const fontStack = (face: SiteStyle['fonts']['display']): string => `${quote(face.family)}, ${face.fallback}`

/** A button over a scrimmed photo keeps its fill; it gets a white edge unless the fill already stands out 3:1 from the darkest-possible-light photo. */
export const photoEdge = (fill: string): string => (contrastRatio(fill, PHOTO_WORST(0.55)) >= 3 ? fill : '#FFFFFF')

/** CSS custom properties for a site style: colours, faces and spacing. Values are schema-checked. */
export function styleVars(style: SiteStyle): string {
  const p = style.palette
  const t = THEMES[style.theme]
  const s = spacing(style)
  const { display: d, body: b, label: l } = style.fonts
  const h3 = t.h3 === 'display'
    ? [`--sb-fh3:${fontStack(d)}`, `--sb-h3w:${d.weight}`, `--sb-h3up:${t.display.upper ? 'uppercase' : 'none'}`, `--sb-h3tr:${t.display.tracking}em`]
    : [`--sb-fh3:${fontStack(l)}`, `--sb-h3w:${l.weight}`, `--sb-h3up:${t.caps.upper ? 'uppercase' : 'none'}`, `--sb-h3tr:${t.caps.tracking}em`]
  return [
    `--sb-ground:${p.ground}`, `--sb-surface:${p.surface}`, `--sb-line:${p.line}`, `--sb-ink:${p.ink}`, `--sb-muted:${p.muted}`,
    `--sb-brand-fill:${p.brandFill}`, `--sb-brand-ink:${p.brandInk}`, `--sb-brand-text:${p.brandText}`,
    `--sb-brand-edge:${p.brandEdge}`, `--sb-accent-c:${p.accent}`, `--sb-photo-edge:${photoEdge(p.brandFill)}`,
    // On the ink band the brand fills buttons and accents only where it stands out from the ink.
    `--sb-ink-btn-bg:${p.onInk ? p.brandFill : p.ground}`, `--sb-ink-btn-fg:${p.onInk ? p.brandInk : p.ink}`, `--sb-ink-accent:${p.onInk ? p.brandFill : p.ground}`,
    ...p.tints.map((c, i) => `--sb-tint${i + 1}:${c}`),
    `--sb-r:${style.radius}px`, `--sb-pr:${Math.round(style.radius * 1.4)}px`, `--sb-fr:${Math.min(style.radius, 14)}px`,
    `--sb-br:${style.button === 'pill' ? 999 : Math.min(style.radius, 14)}px`,
    `--sb-pad:${s.pad}px`, `--sb-gap:${s.gap}px`, `--sb-py:${s.py}px`,
    `--sb-fd:${fontStack(d)}`, `--sb-dw:${d.weight}`, `--sb-fb:${fontStack(b)}`, `--sb-bw:${b.weight}`,
    `--sb-fl:${fontStack(l)}`, `--sb-lw:${l.weight}`,
    `--sb-dup:${t.display.upper ? 'uppercase' : 'none'}`, `--sb-dtr:${t.display.tracking}em`, `--sb-dlh:${t.display.leading}`,
    `--sb-lup:${t.caps.upper ? 'uppercase' : 'none'}`, `--sb-ltr:${t.caps.tracking}em`,
    ...h3,
  ].join(';') + ';'
}

/** Type sizes for one section at its step. */
export function sizeVars(style: SiteStyle, step: Step): string {
  const z = sizesFor(style, step)
  return `--sb-h1:${z.h1}px;--sb-h1m:${z.h1m}px;--sb-h2:${z.h2}px;--sb-h2m:${z.h2m}px;--sb-xl:${z.xl}px;--sb-xlm:${z.xlm}px;--sb-h3:${z.h3}px;--sb-lead:${z.lead}px;`
}
