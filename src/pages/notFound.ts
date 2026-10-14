import { BRAND } from '../brand/config'
import { esc } from './html'
import { chrome } from './types/chrome'
import { HUB_PATH } from './types/paths'

/**
 * The friendly 404 page (dist/404.html), served by Cloudflare for any address that isn't a
 * file (server/wrangler.app.jsonc: not_found_handling "404-page"). Never indexed.
 */
export const notFoundHead = (): string =>
  `<title>Page not found · ${esc(BRAND.name)}</title>\n    <meta name="robots" content="noindex">`

export function notFoundBody(): string {
  return chrome('<div class="pg-hero pg-hero--blue wf-404">'
    + '<p class="pg-kicker">Error 404</p>'
    + '<h1 class="hp-h1 pg-h1">We can’t find that page</h1>'
    + '<p class="wf-hub-lead">It may have moved, or the link has a typo. Here are the places most people are looking for.</p>'
    + '</div>'
    + '<ul class="wf-404-links">'
    + '<li class="hp-tile wf-404-card"><h2 class="wf-panel-title">Build your website</h2><p>Free to build, about 15 minutes, and you only pay when you’re happy.</p><a href="/build/" class="sb-main-btn hp-btn hp-btn--start" data-build>Start building</a></li>'
    + `<li class="hp-tile wf-404-card"><h2 class="wf-panel-title">Websites for your trade</h2><p>Examples and what we fill in, trade by trade.</p><a class="wf-link" href="${HUB_PATH}">See every trade</a></li>`
    + '<li class="hp-tile wf-404-card"><h2 class="wf-panel-title">Back to the start</h2><p>How it works, the price and the questions people ask.</p><a class="wf-link" href="/">Go to the homepage</a></li>'
    + '</ul>')
}
