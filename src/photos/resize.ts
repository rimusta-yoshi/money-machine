/**
 * Browser-side photo preparation: decode, shrink, re-encode. No React and no storage
 * here, so the same code can feed an R2 upload later (see store.ts).
 */

export const PHOTO_LIMITS = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.8,
  /** Phone photos are rarely over 15 MB; anything much bigger is probably not a photo. */
  maxInputBytes: 25 * 1024 * 1024,
} as const

export type OutputType = 'image/webp' | 'image/jpeg'

export interface ResizedPhoto {
  blob: Blob
  type: OutputType
  width: number
  height: number
}

export interface DecodedImage {
  width: number
  height: number
  source: CanvasImageSource
  close?: () => void
}

/** Decoding and encoding, injected so tests (and other runtimes) can swap them. */
export interface ImageCodec {
  decode(file: Blob): Promise<DecodedImage>
  encode(image: DecodedImage, width: number, height: number, type: OutputType, quality: number): Promise<Blob>
}

/** A problem the customer can act on. `message` is written for them. */
export class PhotoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PhotoError'
  }
}

/** Scales down (never up) to fit within the box, keeping the aspect ratio. */
export function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number): { width: number; height: number } {
  if (width <= 0 || height <= 0) throw new PhotoError('That image looks empty. Try another photo.')
  const scale = Math.min(1, maxWidth / width, maxHeight / height)
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

function checkInput(file: Blob): void {
  if (!file.type.startsWith('image/')) throw new PhotoError('That file isn’t a photo. Choose a JPEG, PNG or WebP image.')
  if (file.size > PHOTO_LIMITS.maxInputBytes) throw new PhotoError('That photo is too large (over 25 MB). Try a smaller one.')
}

/**
 * Shrinks a photo to at most 1600 px and re-encodes it as WebP at ~80%, falling back to
 * JPEG where the browser can't encode WebP (older Safari hands back PNG instead).
 */
export async function resizePhoto(file: Blob, codec: ImageCodec = browserCodec): Promise<ResizedPhoto> {
  checkInput(file)
  let image: DecodedImage
  try {
    image = await codec.decode(file)
  } catch {
    throw new PhotoError('We couldn’t open that photo. Try a JPEG or PNG version of it.')
  }
  try {
    const { width, height } = fitWithin(image.width, image.height, PHOTO_LIMITS.maxWidth, PHOTO_LIMITS.maxHeight)
    const webp = await codec.encode(image, width, height, 'image/webp', PHOTO_LIMITS.quality)
    if (webp.type === 'image/webp') return { blob: webp, type: 'image/webp', width, height }
    const jpeg = await codec.encode(image, width, height, 'image/jpeg', PHOTO_LIMITS.quality)
    return { blob: jpeg, type: 'image/jpeg', width, height }
  } finally {
    image.close?.()
  }
}

/** Real browsers: createImageBitmap (respects EXIF rotation) and a canvas. */
export const browserCodec: ImageCodec = {
  async decode(file) {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return { width: bitmap.width, height: bitmap.height, source: bitmap, close: () => bitmap.close() }
  },
  async encode(image, width, height, type, quality) {
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(width, height)
      draw(canvas.getContext('2d'), image, width, height, type)
      return canvas.convertToBlob({ type, quality })
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    draw(canvas.getContext('2d'), image, width, height, type)
    return new Promise((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new PhotoError('We couldn’t save that photo. Try another one.'))), type, quality),
    )
  },
}

function draw(ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null, image: DecodedImage, w: number, h: number, type: OutputType) {
  if (!ctx) throw new PhotoError('Your browser couldn’t process that photo.')
  // JPEG has no transparency; without a fill, transparent areas come out black.
  if (type === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, w, h)
  }
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image.source, 0, 0, w, h)
}
