import { describe, expect, it, vi } from 'vitest'
import { TRADE_IDS } from '../types'
import { loadStockPhotos, STOCK_PHOTO_FILES, stockPhotosBase, stockSetFor } from './stockPhotos'
import { SAMPLE_SET_SIZE, STOCK_PHOTOS, STOCK_PHOTOS as LIST } from './stockPhotoFiles'

describe('where stock photos load from', () => {
  it('uses our own storage when configured, in any build', () => {
    expect(stockPhotosBase({ DEV: false, VITE_SAMPLE_PHOTOS_URL: 'https://samples.example.com/stock/' })).toBe('https://samples.example.com/stock')
  })

  it('falls back to the repo folder on the dev server', () => {
    expect(stockPhotosBase({ DEV: true })).toBe('/reference/sample-photos')
  })

  it('has nowhere to load from in a production build without storage, so placeholders are drawn', () => {
    expect(stockPhotosBase({ DEV: false })).toBeNull()
    expect(stockPhotosBase({ DEV: false, VITE_SAMPLE_PHOTOS_URL: '  ' })).toBeNull()
  })

  it('lists the files to upload, with names the API serves', () => {
    expect(STOCK_PHOTO_FILES).toHaveLength(LIST.length)
    expect(new Set(STOCK_PHOTO_FILES).size).toBe(STOCK_PHOTO_FILES.length)
    for (const f of STOCK_PHOTO_FILES) expect(f).toMatch(/^[a-z-]+\.jpg$/)
  })
})

describe('sample photo sets', () => {
  it('gives every trade a full set: a hero first, its own trade’s photos before any others', () => {
    for (const trade of TRADE_IDS) {
      const set = stockSetFor(trade, 7)
      expect(set.length, trade).toBeGreaterThanOrEqual(SAMPLE_SET_SIZE)
      expect(set[0].hero, trade).toBe(true)
      const own = set.map(p => p.trade === trade)
      // Photos of the trade itself come before photos that suit any trade (apart from the hero).
      expect(own.slice(1).indexOf(false) === -1 || own.slice(1).slice(own.slice(1).indexOf(false)).every(x => !x), trade).toBe(true)
      for (const p of set) expect([trade, 'any']).toContain(p.trade)
      expect(new Set(set.map(p => p.file)).size).toBe(set.length)
      expect(set.every(p => p.alt.startsWith('Sample photo'))).toBe(true)
    }
  })

  it('is the same set for the same seed, and differs between builders of one trade', () => {
    expect(stockSetFor('landscaper', 42)).toEqual(stockSetFor('landscaper', 42))
    const looks = new Set(Array.from({ length: 20 }, (_, i) => stockSetFor('landscaper', i * 7919).map(p => p.file).join(',')))
    expect(looks.size).toBeGreaterThan(1)
  })

  it('only uses photos from the list', () => {
    const files = new Set(STOCK_PHOTOS.map(p => p.file))
    for (const trade of TRADE_IDS) for (const p of stockSetFor(trade, 3)) expect(files.has(p.file)).toBe(true)
  })
})

describe('loading stock photos', () => {
  const ok = (body: string) => new Response(new Blob([body], { type: 'image/jpeg' }), { headers: { 'content-type': 'image/jpeg' } })

  it('leaves out photos storage doesn’t have yet, keeping the rest in order', async () => {
    const set = stockSetFor('roofer', 1)
    const missing = new Set([set[1].file, set[3].file])
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async url => (missing.has(String(url).split('/').pop()!) ? new Response('', { status: 404 }) : ok(String(url))))
    try {
      const photos = await loadStockPhotos(set, 'https://samples.test/a')
      expect(photos?.map(p => p.alt)).toEqual(set.filter(p => !missing.has(p.file)).map(p => p.alt))
    } finally {
      fetcher.mockRestore()
    }
  })

  it('gives up (placeholders instead) when too few arrive', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('', { status: 404 }))
    try {
      expect(await loadStockPhotos(stockSetFor('painter', 1), 'https://samples.test/b')).toBeNull()
    } finally {
      fetcher.mockRestore()
    }
  })
})
