import { useEffect, useMemo, useState } from 'react'
import { generateOptions, SECTIONS } from '../gen'
import type { AnySpec, Options, SectionKey, SiteStyle } from '../gen'
import { createDomMeasurer, loadStyleFonts } from '../gen/dom/measure'
import { valueKey } from './contentKey'

const EMPTY = (batchSeed: number): Options => ({ batchSeed, generated: 0, shown: [], valid: [], rejected: [], gated: [] })

/**
 * Runs the generator for one section in the browser: waits for the style's fonts, then
 * measures each candidate off-screen. Same batch seed + content + style gives the same
 * options, so a revisit shows what the customer saw before. While a new batch is
 * generating, the previous options stay available and `pending` is true.
 */
export function useSectionOptions(type: SectionKey, view: unknown, style: SiteStyle, batchSeed: number) {
  const [result, setResult] = useState<{ key: string; options: Options<AnySpec> } | null>(null)
  // The view and style arrive as fresh objects on every render; key on their values.
  const key = useMemo(() => valueKey([type, view, style, batchSeed]), [type, view, style, batchSeed])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      await loadStyleFonts(document, style)
      if (cancelled) return
      const measurer = createDomMeasurer(document)
      try {
        const options = generateOptions(SECTIONS[type], { batchSeed, content: view, style, measurer })
        if (!cancelled) setResult({ key, options })
      } finally {
        measurer.dispose()
      }
    }
    run().catch(err => {
      console.error(`Generating ${type} options failed`, err)
      if (!cancelled) setResult({ key, options: EMPTY(batchSeed) })
    })
    return () => { cancelled = true }
    // `key` captures type, view, style and batchSeed by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { options: result?.key === key ? result.options : result?.options ?? null, pending: result?.key !== key }
}
