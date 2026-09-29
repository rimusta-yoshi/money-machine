import { esc, safeUrl } from '../html'
import { businessName } from '../content'
import type { PageContent } from '../content'
import { styleVars } from '../core/vars'
import { sectionVars } from '../core/fit'
import { icon } from '../core/markup'
import type { SiteStyle } from '../schema'

/** The page header: business name and a call link. Not a pickable section. */
export function renderHeader(style: SiteStyle, c: PageContent): string {
  const call = c.business.tel
    ? `<a class="sb-header-call" href="${esc(safeUrl(c.business.tel))}">${icon('phone', 16)}<span>${esc(c.business.phone)}</span></a>`
    : ''
  return `<header class="sb-header" style="${esc(styleVars(style) + sectionVars(style))}"><p class="sb-header-name">${esc(businessName(c))}</p>${call}</header>`
}

/** Page chrome: skip link and header. Include once per page with the section CSS. */
export const PAGE_CSS = `
.sb-page{margin:0;background:var(--sb-page-bg,#fff)}
.sb-skip{position:absolute;left:12px;top:-60px;z-index:100;padding:12px 16px;border-radius:8px;background:#111;color:#fff;font-weight:700;text-decoration:none}
.sb-skip:focus{top:12px;outline:3px solid #fff;outline-offset:2px}
.sb-page main:focus{outline:none}
.sb-header{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:56px;padding:8px var(--sb-pad);background:var(--sb-ground);color:var(--sb-ink);border-bottom:1px solid color-mix(in srgb,var(--sb-ink) 12%,transparent);font-family:var(--sb-fb)}
.sb-header-name{margin:0;font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:19px;letter-spacing:var(--sb-tr);text-transform:var(--sb-up);overflow-wrap:anywhere}
.sb-header-call{display:inline-flex;align-items:center;gap:8px;min-height:44px;color:var(--sb-ink);font-weight:700;text-decoration:underline;text-underline-offset:4px;white-space:nowrap}
.sb-header-call .sb-icon{color:var(--sb-brand-text)}
.sb-header-call:focus-visible{outline:3px solid var(--sb-ink);outline-offset:3px}
@media (max-width: 719px){.sb-header{padding:8px 16px}}
`
