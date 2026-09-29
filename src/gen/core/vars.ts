import { heroSizes } from '../hero/metrics'
import { fontStack } from '../style'
import type { SiteStyle } from '../schema'

/** CSS custom properties for a site style. Values are schema-checked, so this is safe in a style attribute. */
export function styleVars(style: SiteStyle): string {
  const p = style.palette
  const z = heroSizes(style)
  return [
    `--sb-ground:${p.ground}`, `--sb-surface:${p.surface}`, `--sb-ink:${p.ink}`, `--sb-muted:${p.muted}`,
    `--sb-brand-fill:${p.brandFill}`, `--sb-brand-ink:${p.brandInk}`, `--sb-brand-text:${p.brandText}`,
    `--sb-r:${style.radius}px`, `--sb-pad:${z.pad}px`, `--sb-gap:${z.gap}px`,
    `--sb-hs:${z.headline}px`, `--sb-hs-m:${z.headlineMobile}px`,
    `--sb-fd:${fontStack(style.display)}`, `--sb-dw:${style.display.weight}`,
    `--sb-fb:${fontStack(style.body)}`, `--sb-bw:${style.body.weight}`,
    `--sb-up:${style.displayUpper ? 'uppercase' : 'none'}`, `--sb-tr:${style.tracking}em`,
    `--sb-bh:${style.buttonHeight}px`, `--sb-bd:${style.border}px`,
    `--sb-bup:${style.buttonUpper ? 'uppercase' : 'none'}`, `--sb-btr:${style.buttonUpper ? '0.08em' : '0'}`,
  ].join(';') + ';'
}
