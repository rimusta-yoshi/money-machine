import { describe, expect, it } from 'vitest'
import { STOCK_PHOTO_FILES, stockPhotosBase } from './stockPhotos'

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

  it('lists the files to upload', () => {
    expect(STOCK_PHOTO_FILES).toContain('bathroom.jpg')
    expect(STOCK_PHOTO_FILES).toHaveLength(8)
  })
})
