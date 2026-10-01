import { useEffect, useMemo, useState } from 'react'
import { THEMES } from '../gen'
import type { PageContent, PagePhoto } from '../gen'
import type { TradeConfig } from '../types'
import { pageContent } from '../site/pageContent'
import type { Site } from '../site/schema'
import { withSample, withSamplePhotos } from '../sample/content'
import { samplePhotos } from '../sample/photos'
import { loadStockPhotos } from '../sample/stockPhotos'

/**
 * Whether empty photo slots show sample photos while building, so photo layouts can be
 * seen and picked before the customer has photos. Set to false to show only their own.
 * Either way samples never reach the record: the finish step re-checks every pick against
 * the real content, and a page with samples can't be published.
 */
export const SAMPLE_PHOTOS_WHILE_BUILDING = true

/**
 * The content the builder lays out: the customer's own, plus sample photos in empty
 * slots, plus (dev only) sample text everywhere. The preview, the layout options and fit
 * repair all use this, so a pick is never repaired away for content the preview showed.
 */
export function usePreviewContent(site: Site | null, trade: TradeConfig | null, sampleText: boolean): PageContent | null {
  const wantPhotos = SAMPLE_PHOTOS_WHILE_BUILDING || sampleText
  // Drawn placeholders straight away (made once, so the content stays stable), stock photos once loaded (dev server only).
  const [placeholders] = useState<PagePhoto[] | null>(() => (wantPhotos && typeof document !== 'undefined' ? samplePhotos() : null))
  const [stock, setStock] = useState<PagePhoto[] | null>(null)
  useEffect(() => {
    if (!wantPhotos) return
    let live = true
    loadStockPhotos().then(p => { if (live) setStock(p) })
    return () => { live = false }
  }, [wantPhotos])

  return useMemo(() => {
    if (!site || !trade) return null
    const own = pageContent(site, trade)
    const photos = stock ?? placeholders ?? []
    if (sampleText) return withSample(own, photos, THEMES[site.style.theme].voice.why)
    return SAMPLE_PHOTOS_WHILE_BUILDING ? withSamplePhotos(own, photos) : own
  }, [site, trade, sampleText, stock, placeholders])
}
