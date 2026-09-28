import { useEffect, useMemo, useState } from 'react'
import { generateHeroOptions } from '../gen'
import type { HeroContent, HeroOptions, SiteStyle } from '../gen'
import { createDomMeasurer, loadStyleFonts } from '../gen/dom/measure'

const EMPTY = (batchSeed: number): HeroOptions => ({ batchSeed, generated: 0, shown: [], rejected: [], gated: [] })

/**
 * Runs the hero generator in the browser: waits for the style's fonts, then measures each
 * candidate off-screen. Same batch seed + content + style gives the same options, so a
 * revisit shows what the customer saw before. While a new batch is generating, the
 * previous options stay available and `pending` is true.
 */
export function useHeroOptions(content: HeroContent, style: SiteStyle, batchSeed: number) {
  const [result, setResult] = useState<{ key: string; options: HeroOptions } | null>(null)
  // Content and style arrive as fresh objects on every render; key on their values.
  const key = useMemo(() => JSON.stringify([content, style, batchSeed]), [content, style, batchSeed])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      await loadStyleFonts(document, style)
      if (cancelled) return
      const measurer = createDomMeasurer(document)
      try {
        const options = generateHeroOptions({ batchSeed, content, style, measurer })
        if (!cancelled) setResult({ key, options })
      } finally {
        measurer.dispose()
      }
    }
    run().catch(err => {
      console.error('Hero generation failed', err)
      if (!cancelled) setResult({ key, options: EMPTY(batchSeed) })
    })
    return () => { cancelled = true }
    // `key` captures content, style and batchSeed by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { options: result?.options ?? null, pending: result?.key !== key }
}
