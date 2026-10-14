import { BRAND } from '../brand/config'
import { esc } from './html'

/**
 * The link-preview cards (1200×630) that npm run pack:images photographs into public/og/:
 * one for the homepage, one per "Websites for…" page. Block Party tiles: the pitch on night,
 * "pay once" on hard-hat yellow, and a screenshot of one of the page's example sites.
 * No price in the picture, so a price change never leaves old images behind.
 */
export interface OgCard {
  kicker: string
  headline: string
  /** A screenshot to show beside the pitch (a path on the dev server), or none. */
  shot: string | null
}

const CSS = `
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;overflow:hidden}
body{background:#fff;font-family:'DM Sans',system-ui,sans-serif;color:#1C1A24;padding:18px;display:grid;grid-template-columns:690px 1fr;gap:14px}
.pitch{background:#1C1A24;color:#fff;border-radius:36px;padding:48px 50px;display:flex;flex-direction:column;justify-content:space-between}
.kicker{color:#FFCE3A;font-weight:700;font-size:28px}
h1{font-family:'Unbounded',sans-serif;font-weight:900;font-size:58px;line-height:1.02;letter-spacing:-0.035em}
.brand{display:flex;align-items:center;gap:16px;font-family:'Unbounded',sans-serif;font-weight:900;font-size:30px;letter-spacing:-0.03em}
.mark{display:grid;grid-template-columns:repeat(2,26px);grid-template-rows:repeat(2,26px);gap:5px}
.mark span{border-radius:7px}.mark span:nth-child(1){background:#FF5A36}.mark span:nth-child(2){background:#FFCE3A}.mark span:nth-child(3){background:#2F64E0}.mark span:nth-child(4){background:#fff}
.side{display:grid;grid-template-rows:auto 1fr;gap:14px;min-height:0}
.once{background:#FFCE3A;border-radius:36px;padding:30px 34px;font-family:'Unbounded',sans-serif;font-weight:900;font-size:40px;line-height:1.05;letter-spacing:-0.03em}
.once small{display:block;margin-top:10px;font-family:'DM Sans',sans-serif;font-weight:700;font-size:22px;letter-spacing:0}
.shot{border-radius:36px;overflow:hidden;background:#F2F2F4;border:3px solid #ECECF0;min-height:0}
.shot img{display:block;width:100%;height:100%;object-fit:cover;object-position:top left}
.blocks{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:14px;min-height:0}
.blocks span{border-radius:30px}.blocks span:nth-child(1){background:#FF5A36}.blocks span:nth-child(2){background:#2F64E0}.blocks span:nth-child(3){background:#2DBE8A}.blocks span:nth-child(4){background:#F2F2F4}
`

export function ogCardHtml(card: OgCard): string {
  const side = card.shot
    ? `<div class="shot"><img src="${esc(card.shot)}" alt=""></div>`
    : '<div class="blocks"><span></span><span></span><span></span><span></span></div>'
  return '<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><link rel="stylesheet" href="/fonts/fonts.css">'
    + `<style>${CSS}</style></head><body>`
    + `<div class="pitch"><p class="kicker">${esc(card.kicker)}</p><h1>${esc(card.headline)}</h1>`
    + `<p class="brand"><span class="mark"><span></span><span></span><span></span><span></span></span>${esc(BRAND.wordmark)}</p></div>`
    + `<div class="side"><p class="once">Pay once.<small>No monthly fees. Live in about 15 minutes.</small></p>${side}</div>`
    + '</body></html>'
}
