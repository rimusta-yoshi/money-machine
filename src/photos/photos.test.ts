// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { fitWithin, HEIC_MESSAGE, isHeic, PHOTO_LIMITS, PhotoError, resizePhoto } from './resize'
import type { ImageCodec, OutputType } from './resize'
import { blobToDataUrl, dataUrlStore } from './store'

/** A codec that pretends to decode a photo of the given size and encodes as asked. */
function fakeCodec(width: number, height: number, encodes: (type: OutputType) => string = t => t) {
  const close = vi.fn()
  const encode = vi.fn(async (_img: unknown, w: number, h: number, type: OutputType, quality: number) =>
    new Blob([`${w}x${h}@${quality}`], { type: encodes(type) }))
  const codec: ImageCodec = {
    decode: async () => ({ width, height, source: {} as CanvasImageSource, close }),
    encode,
  }
  return { codec, encode, close }
}

const photoFile = (type = 'image/jpeg') => new Blob(['x'], { type })

describe('fitWithin', () => {
  it('shrinks landscape and portrait photos to fit 1600px, keeping the shape', () => {
    expect(fitWithin(4000, 3000, 1600, 1600)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(3000, 4000, 1600, 1600)).toEqual({ width: 1200, height: 1600 })
  })

  it('never makes a small photo bigger', () => {
    expect(fitWithin(800, 600, 1600, 1600)).toEqual({ width: 800, height: 600 })
  })

  it('rejects an empty image', () => {
    expect(() => fitWithin(0, 10, 1600, 1600)).toThrow(PhotoError)
  })
})

describe('resizePhoto', () => {
  it('re-encodes as WebP at ~80% within the size limit', async () => {
    const { codec, encode, close } = fakeCodec(4032, 3024)
    const out = await resizePhoto(photoFile(), codec)
    expect(out).toMatchObject({ type: 'image/webp', width: 1600, height: 1200 })
    expect(encode).toHaveBeenCalledWith(expect.anything(), 1600, 1200, 'image/webp', PHOTO_LIMITS.quality)
    expect(close).toHaveBeenCalled()
  })

  it('falls back to JPEG when the browser can’t encode WebP', async () => {
    const { codec, encode } = fakeCodec(2000, 1000, type => (type === 'image/webp' ? 'image/png' : type))
    const out = await resizePhoto(photoFile(), codec)
    expect(out.type).toBe('image/jpeg')
    expect(encode).toHaveBeenLastCalledWith(expect.anything(), 1600, 800, 'image/jpeg', PHOTO_LIMITS.quality)
  })

  it('refuses files that aren’t images, with a message for the customer', async () => {
    await expect(resizePhoto(new Blob(['%PDF'], { type: 'application/pdf' }), fakeCodec(1, 1).codec))
      .rejects.toThrow(/isn’t a photo/)
  })

  it('refuses very large files before decoding them', async () => {
    const { codec } = fakeCodec(1, 1)
    const decode = vi.spyOn(codec, 'decode')
    const huge = { type: 'image/jpeg', size: PHOTO_LIMITS.maxInputBytes + 1 } as Blob
    await expect(resizePhoto(huge, codec)).rejects.toThrow(/too large/)
    expect(decode).not.toHaveBeenCalled()
  })

  it('explains when a photo can’t be opened', async () => {
    const codec: ImageCodec = { decode: () => Promise.reject(new Error('bad')), encode: vi.fn() }
    await expect(resizePhoto(photoFile('image/heic'), codec)).rejects.toThrow(PhotoError)
  })
})

describe('iPhone HEIC photos', () => {
  const failing: ImageCodec = { decode: () => Promise.reject(new Error('unsupported')), encode: vi.fn() }

  it('are recognised by type, or by name when the browser reports no type', () => {
    expect(isHeic(new File(['x'], 'IMG_0001.jpg', { type: 'image/heic' }))).toBe(true)
    expect(isHeic(new File(['x'], 'IMG_0001.HEIC', { type: '' }))).toBe(true)
    expect(isHeic(new File(['x'], 'photo.heif', { type: '' }))).toBe(true)
    expect(isHeic(new File(['x'], 'photo.jpg', { type: 'image/jpeg' }))).toBe(false)
  })

  it('get a friendly message with the one-line fix when the browser can’t open them', async () => {
    await expect(resizePhoto(new File(['x'], 'IMG_0001.HEIC', { type: '' }), failing)).rejects.toThrow(HEIC_MESSAGE)
    expect(HEIC_MESSAGE).toMatch(/Export it as JPEG/)
  })

  it('go through normally where the browser can open them (Safari)', async () => {
    const out = await resizePhoto(new File(['x'], 'IMG_0001.HEIC', { type: 'image/heic' }), fakeCodec(4032, 3024).codec)
    expect(out.type).toBe('image/webp')
  })
})

describe('dataUrlStore', () => {
  it('stores a prepared photo as a base64 data URL of its type', async () => {
    const url = await dataUrlStore.put({ blob: new Blob(['abc'], { type: 'image/webp' }), type: 'image/webp', width: 1, height: 1 })
    expect(url).toBe('data:image/webp;base64,YWJj')
    expect(await blobToDataUrl(new Blob(['abc'], { type: 'image/jpeg' }))).toMatch(/^data:image\/jpeg;base64,/)
  })
})
