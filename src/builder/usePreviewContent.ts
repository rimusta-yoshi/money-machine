import { useEffect, useMemo, useState } from 'react'
import { hashString, THEMES } from '../gen'
import type { PageContent, PagePhoto } from '../gen'
import type { TradeConfig } from '../types'
import { pageContent } from '../site/pageContent'
import type { Site } from '../site/schema'
import { withSample, withSamplePhotos } from '../sample/content'
import { samplePhotos } from '../sample/photos'
import { loadStockPhotos, stockSetFor } from '../sample/stockPhotos'

/**
 * Whether empty photo slots show sample photos while building, so photo layouts can be
 * seen and picked before the customer has photos. Set to false to show only their own.
 * Either way samples never reach the record: the finish step re-checks every pick against
 * the real content, and a page with samples can't be published.
 */
export const SAMPLE_PHOTOS_WHILE_BUILDING = true

/**
 * Which sample set a builder gets: from its trade and business name, so it stays the same
 * through colour and style changes, and differs between two builders of the same trade.
 */
export const sampleSeed = (site: { tradeId: Site['tradeId']; business: { name: string } }): number =>
  hashString(`${site.tradeId}|${site.business.name.trim().toLowerCase()}`)

/**
 * The content the builder lays out: the customer's own, plus sample photos (matched to the
 * trade) in empty slots, plus (dev only) sample text everywhere. The preview, the layout
 * options and fit repair all use this, so a pick is never repaired away for content the
 * preview showed, and photo layouts are on offer before any photo is uploaded.
 */
export function usePreviewContent(site: Site | null, trade: TradeConfig | null, sampleText: boolean): PageContent | null {
  const wantPhotos = SAMPLE_PHOTOS_WHILE_BUILDING || sampleText
  // Drawn placeholders straight away (made once, so the content stays stable), stock photos once loaded.
  const [placeholders] = useState<PagePhoto[] | null>(() => (wantPhotos && typeof document !== 'undefined' ? samplePhotos() : null))
  const tradeId = site?.tradeId
  const name = site?.business.name ?? ''
  const set = useMemo(() => (tradeId ? stockSetFor(tradeId, sampleSeed({ tradeId, business: { name } })) : null), [tradeId, name])
  const [stock, setStock] = useState<{ set: typeof set; photos: PagePhoto[] } | null>(null)
  useEffect(() => {
    if (!wantPhotos || !set) return
    let live = true
    loadStockPhotos(set).then(photos => { if (live && photos) setStock({ set, photos }) })
    return () => { live = false }
  }, [wantPhotos, set])

  return useMemo(() => {
    if (!site || !trade) return null
    const own = pageContent(site, trade)
    const photos = (stock?.set === set ? stock?.photos : null) ?? placeholders ?? []
    if (sampleText) return withSample(own, photos, THEMES[site.style.theme].voice.why)
    return SAMPLE_PHOTOS_WHILE_BUILDING ? withSamplePhotos(own, photos) : own
  }, [site, trade, sampleText, stock, set, placeholders])
}
