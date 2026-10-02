import { businessName } from '../gen'
import type { PageContent, SiteStyle } from '../gen'
import { esc, safeUrl } from '../gen/html'
import { sizeVars, styleVars } from '../gen/core/vars'

/**
 * The privacy notice every published site links from its footer: a plain-English template
 * for a sole trader or small firm, filled from the record. It covers what the site does today
 * (no cookies, no forms, no tracking); the enquiry form will add its own paragraph (Phase 3).
 */
export function privacyNotice(c: PageContent, updated: string): string {
  const name = esc(businessName(c))
  const contact = [
    c.business.phone && c.business.tel ? `by phone on <a href="${esc(safeUrl(c.business.tel))}">${esc(c.business.phone)}</a>` : '',
    c.business.email ? `by email at <a href="${esc(safeUrl(`mailto:${c.business.email}`))}">${esc(c.business.email)}</a>` : '',
  ].filter(Boolean).join(' or ')
  const where = c.business.location ? `, ${esc(c.business.location)}` : ''
  const p = (s: string) => `<p>${s}</p>`
  const h2 = (s: string) => `<h2 class="sb-h3">${s}</h2>`
  return [
    p(`This website belongs to ${name}${where}. This notice explains what information the website collects about you and what happens to it.`),
    h2('Who we are'),
    p(`${name} is responsible for any personal information collected through this website.${contact ? ` You can contact us ${contact}.` : ''}`),
    h2('What this website collects'),
    p('This website does not use cookies, analytics or advertising trackers, and it does not ask you for any personal information.'),
    h2('When you phone or email us'),
    p('If you contact us, we use your details only to reply to you and to arrange and carry out the work you ask for. We keep them for as long as we need them for that work and for our business records (for example, tax records), and then delete them. We never sell your details or share them for marketing.'),
    h2('Hosting'),
    p('This website is built and hosted by Site Blocks, using Cloudflare. Like any website, the servers that deliver it briefly process technical information such as your IP address and browser type, to send you the pages and to keep the service secure. It is not used to identify you or to follow you across other websites.'),
    h2('Your rights'),
    p('Under UK data protection law you can ask for a copy of the personal information we hold about you, and ask us to correct or delete it. Contact us using the details above.'),
    p('If you are unhappy with how we have handled your information, you can complain to the Information Commissioner’s Office (ICO) at <a href="https://ico.org.uk/make-a-complaint/">ico.org.uk/make-a-complaint</a> or on 0303 123 1113.'),
    `<p class="sb-legal-updated">Last updated ${esc(updated)}.</p>`,
  ].join('')
}

/** The privacy page's main content, drawn as a plain section in the site's own style. */
export function privacySection(c: PageContent, style: SiteStyle, updated: string): string {
  return `<section class="sb-sec sb-th--${style.theme} sb-legal sb-tone--ground sb-img--right sb-brk--band" aria-labelledby="sb-privacy-title" style="${esc(styleVars(style) + sizeVars(style, 2))}">`
    + `<div class="sb-wrap"><h1 id="sb-privacy-title" class="sb-h2">Privacy notice</h1><div class="sb-legal-body">${privacyNotice(c, updated)}</div></div></section>`
}

export const PRIVACY_CSS = `
.sb-legal .sb-wrap{gap:calc(var(--sb-gap) * 1.5)}
.sb-legal-body{display:flex;flex-direction:column;gap:14px;max-width:68ch}
.sb-legal-body h2{margin-top:14px}
.sb-legal-back{margin:0}
.sb-legal a{color:var(--sb-fg);font-weight:600;text-decoration:underline;text-underline-offset:3px;overflow-wrap:anywhere}
.sb-legal a:focus-visible{outline:3px solid currentColor;outline-offset:2px}
.sb-legal-updated{color:var(--sb-mu);font-size:15px}
`
