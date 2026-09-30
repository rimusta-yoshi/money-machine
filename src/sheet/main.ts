import { GEN_CSS, SECTION_KEYS, SECTIONS, THEME_KEYS, THEMES } from '../gen'
import type { SectionKey, ThemeKey } from '../gen'
import { createDomMeasurer, loadStyleFonts } from '../gen/dom/measure'
import { esc } from '../gen/html'
import { samplePhotos } from '../sample/photos'
import { loadStockPhotos } from '../sample/stockPhotos'
import { tradeById } from '../trades'
import type { TradeId } from '../types'
import { batchFor, resolveSiteStyle, sampleFor, samplePage, sectionOptions, styleSummary, THEME_BRANDS } from './build'
import { A11Y_BRANDS, runA11y } from './a11y'
import { SHEET_CSS } from './css'

/**
 * The contact sheet: for each theme, six generated options for every section and three
 * whole sample pages, all with sample content, each marked with theme, archetype and seed.
 * Query: ?theme=workwear&section=hero&trade=plumber&seed=7 narrow it down while tuning.
 */

declare global { interface Window { __sheet?: { done: boolean; errors: string[]; progress: string } } }

const q = new URLSearchParams(location.search)
const themes = (q.get('theme')?.split(',') ?? THEME_KEYS) as ThemeKey[]
const sections = (q.get('section')?.split(',') ?? SECTION_KEYS) as SectionKey[]
const trade = tradeById[(q.get('trade') ?? 'plumber') as TradeId]
const baseSeed = Number(q.get('seed') ?? 7)
const pages = q.get('pages') === '0' ? 0 : 3
/** Try a customer's colour instead of each mockup's own. */
const brandOverride = q.get('brand')

const state = { done: false, errors: [] as string[], progress: '' }
window.__sheet = state

const style = document.createElement('style')
style.textContent = GEN_CSS + SHEET_CSS
document.head.appendChild(style)
const root = document.getElementById('sheet')!
const status = document.createElement('p')
status.className = 'cs-status'
status.setAttribute('role', 'status')

const tick = () => new Promise(r => setTimeout(r, 0))
const say = (s: string) => { state.progress = s; status.textContent = s }

function nav(): string {
  return `<nav class="cs-nav" aria-label="Themes">${themes.map(t => `<a href="#t-${t}">${esc(THEMES[t].label)}</a>`).join('')}</nav>`
}

async function run() {
  root.innerHTML = `<header class="cs-top"><h1>Theme contact sheet</h1><p>${esc(trade.name)} with sample content and sample stock photos (Pexels, see reference/sample-photos/LICENCE.md). Six options per section, then three whole pages, for each theme. Each option shows desktop (scaled) and phone.</p>${nav()}</header>`
  root.appendChild(status)
  const photos = (await loadStockPhotos()) ?? samplePhotos()
  const measurer = createDomMeasurer(document)
  try {
    for (const theme of themes) {
      const t = THEMES[theme]
      const brand = brandOverride ?? THEME_BRANDS[theme]
      const siteStyle = resolveSiteStyle(theme, brand, baseSeed)
      const content = sampleFor(trade, photos, theme)
      await loadStyleFonts(document, siteStyle)
      const block = document.createElement('section')
      block.className = 'cs-theme'
      block.id = `t-${theme}`
      block.setAttribute('aria-labelledby', `t-${theme}-h`)
      block.innerHTML = `<header class="cs-theme-h"><h2 id="t-${theme}-h">${esc(t.label)}</h2><p>${esc(t.blurb)}</p><p class="cs-meta">Brand ${esc(brand)}${siteStyle.palette.tuned ? ' (tuned for readability)' : ''} · style seed ${baseSeed} · ${styleSummary(siteStyle)} · <a href="../theme-mockups/${theme}.html">mockup</a></p></header>`
      root.appendChild(block)
      for (const type of sections) {
        say(`${t.label}: ${SECTIONS[type].label}…`)
        await tick()
        const rows = sectionOptions(type, siteStyle, content, measurer, batchFor(baseSeed, type))
        const group = document.createElement('div')
        group.className = 'cs-section'
        group.innerHTML = `<h3 class="cs-section-h">${esc(SECTIONS[type].label)} <span>${rows.length} option${rows.length === 1 ? '' : 's'}</span></h3>`
          + rows.map(({ candidate: c, html }) => {
            const tag = `${esc(t.label)} · ${esc(SECTIONS[type].label)} · <code>${esc(c.spec.archetype)}</code> · seed ${c.seed} · step ${c.spec.step} · punch ${(c.score.punch ?? 0).toFixed(2)}`
            const params = esc(JSON.stringify(c.spec.params))
            return `<article class="cs-opt"><p class="cs-tag">${tag}<span class="cs-params">${params}</span></p><div class="cs-views"><div class="cs-desk"><div class="cs-desk-in">${html}</div></div><div class="cs-phone"><div class="cs-phone-in">${html}</div></div></div></article>`
          }).join('')
        block.appendChild(group)
      }
      for (let i = 0; i < pages; i++) {
        const seed = baseSeed * 101 + i * 7919 + 1
        const pageStyle = resolveSiteStyle(theme, brand, seed)
        await loadStyleFonts(document, pageStyle)
        say(`${t.label}: sample page ${i + 1}…`)
        await tick()
        const html = samplePage(pageStyle, seed, content, measurer)
        const el = document.createElement('div')
        el.className = 'cs-page'
        el.innerHTML = `<h3 class="cs-section-h">Sample page ${i + 1} <span>style seed ${seed} · ${styleSummary(pageStyle)}</span></h3><div class="cs-views"><div class="cs-desk cs-desk--page"><div class="cs-desk-in sb-page">${html}</div></div><div class="cs-phone cs-phone--page"><div class="cs-phone-in sb-page">${html}</div></div></div>`
        block.appendChild(el)
      }
    }
    say('Done.')
  } catch (err) {
    state.errors.push(String((err as Error)?.stack ?? err))
    say(`Failed: ${String(err)}`)
    throw err
  } finally {
    measurer.dispose()
    state.done = true
  }
}

if (q.get('mode') === 'a11y') {
  root.appendChild(status)
  status.textContent = 'Checking accessibility…'
  runA11y(root, themes, q.get('brands')?.split(',') ?? A11Y_BRANDS, Number(q.get('options') ?? 6))
} else {
  run()
}
