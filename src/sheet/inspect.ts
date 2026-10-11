import { generateOptions, resolveSiteStyle, sectionBatch, SECTIONS, specKey, viewOf } from '../gen'
import type { AnySpec, Candidate, PageContent, PagePhoto, SectionKey, SiteStyle, ThemeKey } from '../gen'
import type { DebugInfo } from '../builder/debugInfo'
import { withSamplePhotos } from '../sample/content'
import { parseSite } from '../site/parse'
import { pageContent } from '../site/pageContent'
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
  /** The options the builder showed, when reproducing a pasted case. */
  expected?: readonly AnySpec[]
}

declare global { interface Window { __debugCase?: DebugInfo; __inspect?: { done: boolean; shown: string[]; matches: boolean | null; rejected: Record<string, number>; error?: string } } }

/** A case pasted from the builder's "Copy debug info": its stand-in photos become placeholders. */
export function debugInspectCase(info: DebugInfo, photos: readonly PagePhoto[]): InspectCase {
  const site = parseSite(info.site)
  const own = pageContent(site, tradeById[site.tradeId])
  let i = 0
  const swap = <P extends PagePhoto | null>(p: P): P => (p && p.url.startsWith('https://photo.invalid/') ? { ...p, url: photos[i++ % photos.length].url } : p)
  const content = { ...own, photos: { hero: swap(own.photos.hero), about: swap(own.photos.about), gallery: own.photos.gallery.map(swap) } }
  const section = info.build?.section ?? 'hero'
  return {
    style: site.style.resolved,
    content: info.build?.samples ? withSamplePhotos(content, photos) : content,
    section,
    batchSeed: info.build?.batchSeed ?? sectionBatch(site.style.seed, section),
    expected: info.build?.shown,
  }
}

/** A stress-test case (trade, theme, shape, seed) as an inspect case. */
export function stressInspectCase(q: URLSearchParams, pool?: readonly PagePhoto[]): InspectCase {
  const trade = tradeById[(q.get('trade') ?? 'plumber') as TradeId]
  const theme = (q.get('theme') ?? 'workwear') as ThemeKey
  const seed = Number(q.get('seed') ?? 1)
  const section = (q.get('section') ?? 'hero') as SectionKey
  return {
    style: resolveSiteStyle(theme, q.get('brand') ?? stressBrand(seed), seed),
    content: shapeContent(trade, theme, (q.get('shape') ?? 'photos-7') as Shape, seed, pool),
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
    const shown = o.shown.map(c => specKey(c.spec))
    const counts: Record<string, number> = {}
    for (const c of o.rejected) for (const x of c.checks) if (!x.ok) counts[x.id] = (counts[x.id] ?? 0) + 1
    window.__inspect = { done: true, shown, rejected: counts, matches: k.expected ? JSON.stringify(k.expected.map(specKey)) === JSON.stringify(shown) : null }
  } catch (err) {
    window.__inspect = { done: true, shown: [], rejected: {}, matches: null, error: String((err as Error)?.stack ?? err) }
    throw err
  } finally {
    measurer.dispose()
  }
}
