import { useCallback, useEffect, useMemo, useState } from 'react'
import { repairHero, specKey } from '../gen'
import type { GeneratedHero } from '../gen'
import { createDomMeasurer, loadStyleFonts } from '../gen/dom/measure'
import type { TradeConfig } from '../types'
import { heroContent } from '../site/heroContent'
import type { Site } from '../site/schema'

/** Wait for typing to settle before re-measuring. */
const SETTLE_MS = 500

export const REPAIR_NOTICE = 'Your details changed, so your hero now uses the closest layout that still fits.'
export const FALLBACK_NOTICE = 'Your details no longer fit any of these hero layouts, so we’ve switched to the simplest one. A shorter headline or location may bring the others back.'

export interface Notice { id: number; text: string }

/** Photos are large data URLs; identify them by object rather than re-serialising them on every keystroke. */
const photoIds = new WeakMap<object, number>()
let nextPhotoId = 1
const photoId = (photo: object | null) => {
  if (!photo) return 0
  if (!photoIds.has(photo)) photoIds.set(photo, nextPhotoId++)
  return photoIds.get(photo)!
}

/**
 * Keeps the saved hero honest while the customer edits: after content or style changes,
 * re-measure it in the browser and, if it no longer fits, switch to the nearest passing
 * option from the same batch. Returns a notice to show when that happens.
 */
export function useHeroFitRepair(site: Site | null, trade: TradeConfig | null, onRepair: (hero: GeneratedHero) => void) {
  const [notice, setNotice] = useState<Notice | null>(null)
  const saved = site?.sections.hero
  const input = useMemo(
    () => (site && trade && saved ? { saved, content: heroContent(site, trade), style: site.style.resolved } : null),
    [site, trade, saved],
  )
  // Re-run only when something that affects fit actually changed.
  const key = useMemo(
    () => (input ? JSON.stringify({ ...input, content: { ...input.content, photo: photoId(input.content.photo) } }) : null),
    [input],
  )

  useEffect(() => {
    if (!input) return
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        await loadStyleFonts(document, input.style)
        if (cancelled) return
        const measurer = createDomMeasurer(document)
        try {
          const result = repairHero(input.saved, input.content, input.style, measurer)
          if (cancelled || result.status === 'fits' || specKey(result.hero.spec) === specKey(input.saved.spec)) return
          onRepair(result.hero)
          // A fresh id re-announces the message and restarts its timer, even if the text repeats.
          setNotice(n => ({ id: (n?.id ?? 0) + 1, text: result.status === 'fallback' ? FALLBACK_NOTICE : REPAIR_NOTICE }))
        } finally {
          measurer.dispose()
        }
      } catch (err) {
        console.error('Hero fit check failed', err)
      }
    }, SETTLE_MS)
    return () => { cancelled = true; clearTimeout(timer) }
    // `key` captures input by value; onRepair is a dispatch wrapper.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const dismiss = useCallback(() => setNotice(null), [])
  return { notice, dismiss }
}
