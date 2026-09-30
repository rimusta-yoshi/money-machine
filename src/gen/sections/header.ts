import { esc, safeUrl } from '../html'
import { businessName } from '../content'
import type { PageContent } from '../content'
import { styleVars } from '../core/vars'
import { icon } from '../core/markup'
import type { SectionKey } from '../core/types'
import type { SiteStyle } from '../schema'

/** In-page links the header offers, when those sections are on the page. */
const NAV: readonly [SectionKey, string, string][] = [
  ['services', 'Services', '#services'],
  ['about', 'About', '#about'],
  ['testimonials', 'Reviews', '#reviews'],
  ['contact', 'Contact', '#contact'],
]

/** The first letter or digit of the business name, for the logo tile. */
const initial = (name: string) => (name.match(/[A-Za-z0-9]/)?.[0] ?? '').toUpperCase()

/**
 * The page header: business name, links to the page's own sections, and a call link. Not
 * a pickable section; its look comes from the theme (logo tile, masthead, pill).
 */
export function renderHeader(style: SiteStyle, c: PageContent, sections: readonly SectionKey[] = []): string {
  const name = businessName(c)
  const call = c.business.tel
    ? `<a class="sb-header-call" href="${esc(safeUrl(c.business.tel))}">${icon('phone', 16)}<span>${esc(c.business.phone)}</span></a>`
    : ''
  const links = NAV.filter(([k]) => sections.includes(k)).slice(0, 3)
  const nav = links.length ? `<nav class="sb-nav" aria-label="Page sections">${links.map(([, label, href]) => `<a href="${href}">${label}</a>`).join('')}</nav>` : ''
  const logo = style.theme === 'workwear' || style.theme === 'friendly-local' ? `<span class="sb-logo" aria-hidden="true">${esc(initial(name))}</span>` : ''
  const dot = style.theme === 'clean-pro' ? '<span class="sb-name-dot" aria-hidden="true">.</span>' : ''
  const brand = `<p class="sb-header-name">${logo}<span>${esc(name)}${dot}</span></p>`
  const inner = style.theme === 'craft-heritage'
    ? `<div class="sb-header-top"><span>${esc(c.business.location)}</span>${call}</div>${brand}${nav}`
    : `${brand}${nav}${call}`
  return `<header class="sb-hd" style="${esc(styleVars(style))}"><div class="sb-header sb-th--${style.theme}">${inner}</div></header>`
}

/** Page chrome: skip link and header. Include once per page with the section CSS. */
export const PAGE_CSS = `
.sb-page{margin:0;background:var(--sb-page-bg,#fff)}
.sb-skip{position:absolute;left:12px;top:-60px;z-index:100;padding:12px 16px;border-radius:8px;background:#111;color:#fff;font-weight:700;text-decoration:none}
.sb-skip:focus{top:12px;outline:3px solid #fff;outline-offset:2px}
.sb-page main:focus{outline:none}
.sb-hd{container-type:inline-size}
.sb-header{display:flex;align-items:center;justify-content:space-between;gap:12px 28px;padding:10px max(var(--sb-pad),calc((100% - 1200px) / 2 + var(--sb-pad)));font-family:var(--sb-fb);box-sizing:border-box}
.sb-header *{box-sizing:border-box}
.sb-header-name{display:flex;align-items:center;gap:12px;margin:0;overflow-wrap:anywhere}
.sb-logo{flex:none;display:grid;place-items:center;line-height:1}
.sb-nav{display:flex;gap:8px 32px;flex-wrap:wrap}
.sb-nav a{display:inline-flex;align-items:center;min-height:44px;color:inherit;text-decoration:none}
.sb-nav a:hover{text-decoration:underline;text-underline-offset:5px}
.sb-header-call{display:inline-flex;align-items:center;gap:8px;min-height:44px;white-space:nowrap}
.sb-header a:focus-visible{outline:3px solid currentColor;outline-offset:3px}
@container (max-width: 719px){
  .sb-header,.sb-header.sb-th--craft-heritage{flex-direction:row;flex-wrap:nowrap;min-height:64px;padding:8px 16px;gap:10px}
  .sb-header .sb-nav,.sb-header .sb-header-top>span,.sb-header .sb-logo{display:none}
  .sb-header .sb-header-top{width:auto;order:2}
  .sb-header .sb-header-name{font-size:19px !important}
  .sb-header .sb-header-call{padding:6px 12px !important;font-size:15px !important}
}
`
