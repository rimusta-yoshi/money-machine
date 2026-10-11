import { generateOptions, resolveSiteStyle, sectionBatch, SECTIONS, viewOf } from '../gen'
import type { Candidate, PageContent, SectionKey, SiteStyle, ThemeKey } from '../gen'
import { createDomMeasurer, loadStyleFonts } from '../gen/dom/measure'
import { esc } from '../gen/html'
import { tradeById } from '../trades'
import type { TradeId } from '../types'
import { uniqueIds } from './build'
import { shapeContent, stressBrand } from './stress'
import type { Shape } from './stress'

/**
 * One section's whole batch, passed and rejected, with the checks each candidate failed:
 * sheet.html?mode=inspect&trade=gallery… for tuning the hard checks by eye, and for
 * reproducing a case pasted from the builder's "Copy debug info" (?case=<json>).
 */

export interface InspectCase {
  style: SiteStyle
  content: PageContent
  section: SectionKey
  batchSeed: number
}

/** A stress-test case (trade, theme, shape, seed) as an inspect case. */
export function stressInspectCase(q: URLSearchParams): InspectCase {
  const trade = tradeById[(q.get('trade') ?? 'plumber') as TradeId]
  const theme = (q.get('theme') ?? 'workwear') as ThemeKey
  const seed = Number(q.get('seed') ?? 1)
  const section = (q.get('section') ?? 'hero') as SectionKey
  return {
    style: resolveSiteStyle(theme, q.get('brand') ?? stressBrand(seed), seed),
    content: shapeContent(trade, theme, (q.get('shape') ?? 'photos-7') as Shape, seed),
    section,
    batchSeed: q.get('batch') ? Number(q.get('batch')) : sectionBatch(seed, section),
  }
}

function card(c: Candidate, html: string, passed: boolean): string {
  const failed = c.checks.filter(x => !x.ok)
  const why = failed.map(x => `<li><b>${esc(x.id)}</b> ${esc(x.detail)}</li>`).join('')
  const tag = `${passed ? 'PASS' : 'REJECTED'} · <code>${esc(c.spec.archetype)}</code> · seed ${c.seed} · step ${c.spec.step}`
  return `<article class="cs-opt"><p class="cs-tag">${tag}<span class="cs-params">${esc(JSON.stringify(c.spec.params))}</span></p>${why ? `<ul class="cs-why">${why}</ul>` : ''}`
    + `<div class="cs-views"><div class="cs-desk"><div class="cs-desk-in">${html}</div></div><div class="cs-phone"><div class="cs-phone-in">${html}</div></div></div></article>`
}

export async function runInspect(root: HTMLElement, k: InspectCase, onlyCheck: string | null) {
  const def = SECTIONS[k.section]
  const view = viewOf(k.section, k.content)
  await loadStyleFonts(document, k.style)
  const measurer = createDomMeasurer(document)
  try {
    await measurer.prepare(k.style, view)
    const o = generateOptions(def, { batchSeed: k.batchSeed, content: view, style: k.style, measurer })
    const render = (c: Candidate) => uniqueIds(def.render(c.spec, k.style, view, { band: def.fixedBand?.(c.spec as never) ?? 'ground', side: 'right', motif: true }))
    const rejected = o.rejected.filter(c => !onlyCheck || c.checks.some(x => !x.ok && x.id === onlyCheck))
    root.insertAdjacentHTML('beforeend', `<header class="cs-top"><h1>${esc(def.label)}: ${o.shown.length} shown, ${o.valid.length} valid, ${o.rejected.length} rejected</h1><p>${esc(k.style.theme)} · batch ${k.batchSeed}${onlyCheck ? ` · only ${esc(onlyCheck)}` : ''}</p></header>`)
    root.insertAdjacentHTML('beforeend', o.shown.map(c => card(c, render(c), true)).join('') + rejected.slice(0, 24).map(c => card(c, render(c), false)).join(''))
  } finally {
    measurer.dispose()
  }
}
