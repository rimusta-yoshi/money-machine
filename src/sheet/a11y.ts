import axe from 'axe-core'
import { SECTION_KEYS, THEME_KEYS } from '../gen'
import type { ThemeKey } from '../gen'
import { createDomMeasurer, loadStyleFonts } from '../gen/dom/measure'
import { samplePhotos } from '../sample/photos'
import { tradeById } from '../trades'
import { batchFor, resolveSiteStyle, sampleFor, samplePage, sectionOptions, THEME_BRANDS } from './build'

/**
 * Accessibility in a real browser: axe with colour contrast ON, for every theme and a
 * spread of brand colours (including awkward ones), over whole sample pages and every
 * shown option of every section, at desktop and phone width. Run by `npm run a11y`.
 */

export const A11Y_BRANDS = ['#1E88E5', '#E8743B', '#FFE500', '#FFF59D', '#808080', '#39FF14', '#0D0D0D', '#F8F8F6', '#0B2545', '#C9A96E', '#7C3AED', '#DC2626']

export interface A11yResult { theme: ThemeKey; brand: string; where: string; width: number; violations: string[] }

declare global { interface Window { __a11y?: { done: boolean; progress: string; checked: number; results: A11yResult[]; errors: string[] } } }

async function check(host: HTMLElement, html: string, width: number): Promise<string[]> {
  const frame = document.createElement('div')
  frame.style.width = `${width}px`
  frame.className = 'sb-page'
  // A page-level h1 for lone sections, so their h2s sit in a real outline.
  frame.innerHTML = html
  host.replaceChildren(frame)
  const result = await axe.run(frame, { rules: { 'color-contrast': { enabled: true }, region: { enabled: false } } })
  return result.violations.flatMap(v => v.nodes.map(n => `${v.id}: ${n.target.join(' ')} — ${n.failureSummary?.split('\n').slice(1).join(' ').trim() ?? ''}`))
}

export async function runA11y(root: HTMLElement, themes: readonly ThemeKey[] = THEME_KEYS, brands: readonly string[] = A11Y_BRANDS, options = 6) {
  const state = { done: false, progress: '', checked: 0, results: [] as A11yResult[], errors: [] as string[] }
  window.__a11y = state
  const host = document.createElement('div')
  root.appendChild(host)
  const content = sampleFor(tradeById.plumber, samplePhotos())
  const measurer = createDomMeasurer(document)
  try {
    for (const theme of themes) for (const brand of [THEME_BRANDS[theme], ...brands]) {
      const style = resolveSiteStyle(theme, brand, 11)
      await loadStyleFonts(document, style)
      state.progress = `${theme} ${brand}`
      const items: [string, string][] = [['page', samplePage(style, 11, content, measurer)]]
      for (const type of SECTION_KEYS) {
        for (const row of sectionOptions(type, style, content, measurer, batchFor(11, type), options)) {
          items.push([`${type}/${row.candidate.spec.archetype} #${row.candidate.seed}`, type === 'hero' ? row.html : `<h1>Page</h1>${row.html}`])
        }
      }
      for (const [where, html] of items) for (const width of [1200, 375]) {
        const violations = await check(host, html, width)
        state.checked++
        if (violations.length) state.results.push({ theme, brand, where, width, violations })
      }
    }
  } catch (err) {
    state.errors.push(String((err as Error)?.stack ?? err))
  } finally {
    measurer.dispose()
    host.remove()
    state.done = true
  }
}
