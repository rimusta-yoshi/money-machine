import { useState } from 'react'
import { PhotoError, resizePhoto } from '../../photos/resize'
import type { ImageCodec } from '../../photos/resize'
import { dataUrlStore } from '../../photos/store'
import type { PhotoStore } from '../../photos/store'
import { photoUrlSchema } from '../../site/schema'

export type PickState = { status: 'idle' } | { status: 'working' } | { status: 'error'; message: string }

/** A prepared photo: where it's stored, and its shape. */
export interface PickedPhoto { url: string; width: number; height: number }

/** Clearly taller than wide: hero layouts that frame a portrait photo are preferred for it. */
export const isTall = (p: Pick<PickedPhoto, 'width' | 'height'>): boolean => p.height > p.width * 1.1

/**
 * Turns a chosen file into a stored photo URL: resize in the browser, then hand to the
 * store (data URL today, R2 later). Errors come back as messages for the customer.
 */
export function usePhotoPicker(store: PhotoStore = dataUrlStore, codec?: ImageCodec) {
  const [state, setState] = useState<PickState>({ status: 'idle' })

  const pickPhoto = async (file: File | undefined): Promise<PickedPhoto | null> => {
    if (!file) return null
    setState({ status: 'working' })
    try {
      const resized = await resizePhoto(file, codec)
      const url = await store.put(resized)
      // Never keep anything the site record would refuse to load later.
      if (!photoUrlSchema.safeParse(url).success) throw new PhotoError('That photo is too detailed to store. Try a smaller or simpler one.')
      setState({ status: 'idle' })
      return { url, width: resized.width, height: resized.height }
    } catch (err) {
      const message = err instanceof PhotoError ? err.message : 'Something went wrong with that photo. Try another one.'
      if (!(err instanceof PhotoError)) console.error('Photo processing failed', err)
      setState({ status: 'error', message })
      return null
    }
  }

  const pick = async (file: File | undefined): Promise<string | null> => (await pickPhoto(file))?.url ?? null

  return { state, pick, pickPhoto }
}
