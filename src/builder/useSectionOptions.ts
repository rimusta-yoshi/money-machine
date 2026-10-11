import { useEffect, useMemo, useState } from 'react'
import { generateOptions, safeOptions, SECTIONS } from '../gen'
import type { AnySpec, Options, SectionKey, SiteStyle } from '../gen'
import { createDomMeasurer } from '../gen/dom/measure'
import { valueKey } from './contentKey'

/** If there are still no options by now, the section's safe layouts are shown instead. */
export const GIVE_UP_MS = 10000

/**
 * Runs the generator for one section in the browser: waits for the style's fonts and the
 * photos, then measures each candidate off-screen. Same batch seed + content + style gives
 * the same options, so a revisit shows what the customer saw before. While a new batch is
 * generating, the previous options stay available and `pending` is true.
 *
 * It can't leave a section dead: slow fonts or photos stop being waited for (PREPARE_MS
 * in gen/dom/measure.ts), any error is logged with the seed and the section's safe
 * layouts are shown, and if nothing has arrived by GIVE_UP_MS they are shown anyway.
 */
export function useSectionOptions(type: SectionKey, view: unknown, style: SiteStyle, batchSeed: number) {
  const [result, setResult] = useState<{ key: string; options: Options<AnySpec> } | null>(null)
  // The view and style arrive as fresh objects on every render; key on their values.
  const key = useMemo(() => valueKey([type, view, style, batchSeed]), [type, view, style, batchSeed])

  useEffect(() => {
    const def = SECTIONS[type]
    let cancelled = false
    let settled = false
    const settle = (options: Options<AnySpec>) => {
      if (cancelled || settled) return
      settled = true
      clearTimeout(giveUp)
      setResult({ key, options })
    }
    const fallBack = (why: string, error?: unknown) => {
      if (cancelled || settled) return
      console.error(`${why}: showing the ${type} section's safe layouts`, { section: type, batchSeed, theme: style.theme, error })
      settle(safeOptions(def, batchSeed, view))
    }
    const giveUp = setTimeout(() => fallBack(`Generating ${type} options took over ${GIVE_UP_MS / 1000}s`), GIVE_UP_MS)
    const run = async () => {
      const measurer = createDomMeasurer(document)
      try {
        await measurer.prepare(style, view)
        if (cancelled || settled) return
        settle(generateOptions(def, { batchSeed, content: view, style, measurer }))
      } finally {
        measurer.dispose()
      }
    }
    run().catch(err => fallBack(`Generating ${type} options failed`, err))
    return () => {
      cancelled = true
      clearTimeout(giveUp)
    }
    // `key` captures type, view, style and batchSeed by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { options: result?.key === key ? result.options : result?.options ?? null, pending: result?.key !== key }
}
