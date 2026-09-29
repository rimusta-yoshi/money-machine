import { useCallback, useEffect, useMemo, useState } from 'react'
import { repairSection, SECTIONS, sectionPresent, specKey, viewOf } from '../gen'
import type { Generated, SectionKey } from '../gen'
import { createDomMeasurer, loadStyleFonts } from '../gen/dom/measure'
import type { TradeConfig } from '../types'
import { SECTION_LABELS } from '../site/labels'
import { pageOrder } from '../site/page'
import { pageContent } from '../site/pageContent'
import type { Site } from '../site/schema'
import { contentKey } from './contentKey'

/** Wait for typing to settle before re-measuring. */
const SETTLE_MS = 500

export interface Notice { id: number; text: string }

export type Change = { type: SectionKey; status: 'restored' | 'repaired' | 'fallback' }

/** One short, plain message for whatever changed in a pass. */
export function noticeText(changes: readonly Change[]): string {
  const label = (t: SectionKey) => SECTION_LABELS[t].toLowerCase()
  const restored = changes.filter(c => c.status === 'restored')
  const swapped = changes.filter(c => c.status !== 'restored')
  const parts: string[] = []
  if (restored.length === 1) parts.push(`The ${label(restored[0].type)} layout you chose fits again, so it’s back.`)
  if (restored.length > 1) parts.push(`${restored.length} layouts you chose fit again, so they’re back.`)
  if (swapped.length === 1) {
    parts.push(swapped[0].status === 'fallback'
      ? `Your details no longer fit any ${label(swapped[0].type)} layout, so we’ve used the simplest one. Shorter text may bring the others back.`
      : `Your details changed, so the ${label(swapped[0].type)} section now uses the closest layout that still fits. Yours comes back if it fits again.`)
  }
  if (swapped.length > 1) parts.push(`Your details changed, so ${swapped.length} sections now use the closest layouts that still fit. Yours come back if they fit again.`)
  return parts.join(' ')
}

/**
 * Keeps every saved section honest while the customer edits. After content or style
 * changes, each saved section is re-measured in the browser:
 * - if the customer's own pick (kept as `preferred`) fits again, it comes back;
 * - if the current layout no longer fits, it switches to the nearest passing option from
 *   the same batch, remembering the customer's pick.
 * Returns a notice to show when anything changed.
 */
export function useFitRepair(site: Site | null, trade: TradeConfig | null, onRepair: (type: SectionKey, value: Generated) => void) {
  const [notice, setNotice] = useState<Notice | null>(null)
  const input = useMemo(() => {
    if (!site || !trade) return null
    const content = pageContent(site, trade)
    const saved = pageOrder(trade, site)
      .filter(t => site.sections[t] && sectionPresent(t, content))
      .map(t => ({ type: t, entry: site.sections[t] as Generated }))
    return saved.length ? { saved, content, style: site.style.resolved } : null
  }, [site, trade])
  // Re-run only when something that affects fit actually changed.
  const key = useMemo(
    () => (input ? `${JSON.stringify([input.saved, input.style])}|${contentKey(input.content)}` : null),
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
        const changes: Change[] = []
        try {
          for (const { type, entry } of input.saved) {
            const result = repairSection(SECTIONS[type], entry, viewOf(type, input.content), input.style, measurer)
            if (cancelled || result.status === 'fits' || specKey(result.entry.spec) === specKey(entry.spec)) continue
            onRepair(type, result.entry)
            changes.push({ type, status: result.status })
          }
        } finally {
          measurer.dispose()
        }
        // A fresh id re-announces the message and restarts its timer, even if the text repeats.
        if (changes.length && !cancelled) setNotice(n => ({ id: (n?.id ?? 0) + 1, text: noticeText(changes) }))
      } catch (err) {
        console.error('Fit check failed', err)
      }
    }, SETTLE_MS)
    return () => { cancelled = true; clearTimeout(timer) }
    // `key` captures input by value; onRepair is a dispatch wrapper.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const dismiss = useCallback(() => setNotice(null), [])
  return { notice, dismiss }
}
