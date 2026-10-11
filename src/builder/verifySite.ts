import { generateOptions, presentSections, repairSection, sectionBatch, SECTIONS, specKey, viewOf } from '../gen'
import type { Generated, Measurer, PageContent, SectionKey } from '../gen'
import { createDomMeasurer } from '../gen/dom/measure'
import type { TradeConfig } from '../types'
import { pageOrder } from '../site/page'
import { pageContent } from '../site/pageContent'
import type { Site } from '../site/schema'

export interface Verified {
  type: SectionKey
  entry: Generated
  /** 'chosen': an unpicked section got its best measured layout; the others come from fit repair. */
  status: 'chosen' | 'restored' | 'repaired' | 'fallback'
}

/**
 * Before the finish step: every section on the page is laid out in this browser at desktop
 * and phone width. Saved picks that no longer fit are repaired (the customer's own pick is
 * kept as `preferred`), and sections nobody picked get the best layout that really passed.
 * Afterwards every section in the record has passed a real layout check, so publishing
 * (which never measures) only renders specs that were measured.
 */
export async function verifySite(site: Site, trade: TradeConfig, measure: MeasurerSource = domMeasurer): Promise<Verified[]> {
  const content = pageContent(site, trade)
  const style = site.style.resolved
  const measurer = await measure.open(site, content)
  try {
    return presentSections(pageOrder(trade, site), content).flatMap((type): Verified[] => {
      const def = SECTIONS[type]
      const view = viewOf(type, content)
      const saved = site.sections[type] as Generated | undefined
      const seed = saved?.seed ?? sectionBatch(site.style.seed, type)
      // One section failing to check never holds up the rest: it keeps its pick, or gets its safe layout.
      try {
        if (!saved) {
          const { shown } = generateOptions(def, { batchSeed: seed, content: view, style, measurer, show: 1 })
          return [{ type, entry: { seed, spec: shown[0]?.spec ?? def.fallback }, status: 'chosen' }]
        }
        const result = repairSection(def, saved, view, style, measurer)
        if (result.status === 'fits' || specKey(result.entry.spec) === specKey(saved.spec)) return []
        return [{ type, entry: result.entry, status: result.status }]
      } catch (err) {
        console.error(`Checking the ${type} section failed`, { seed, spec: saved?.spec ?? null, err })
        return saved ? [] : [{ type, entry: { seed, spec: def.fallback }, status: 'chosen' }]
      }
    })
  } finally {
    measurer.dispose()
  }
}

/** Where measurements come from: this document in the builder, a stand-in in tests. */
export interface MeasurerSource { open: (site: Site, content: PageContent) => Promise<Measurer & { dispose: () => void }> }

const domMeasurer: MeasurerSource = {
  open: async (site, content) => {
    const measurer = createDomMeasurer(document)
    try {
      await measurer.prepare(site.style.resolved, content)
    } catch (err) {
      measurer.dispose()
      throw err
    }
    return measurer
  },
}
