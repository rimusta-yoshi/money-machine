import { useState } from 'react'
import { PhotoError, resizePhoto } from '../../photos/resize'
import type { ImageCodec } from '../../photos/resize'
import { dataUrlStore } from '../../photos/store'
import type { PhotoStore } from '../../photos/store'
import { photoUrlSchema } from '../../site/schema'

export type PickState = { status: 'idle' } | { status: 'working' } | { status: 'error'; message: string }

/**
 * Turns a chosen file into a stored photo URL: resize in the browser, then hand to the
 * store (data URL today, R2 later). Errors come back as messages for the customer.
 */
export function usePhotoPicker(store: PhotoStore = dataUrlStore, codec?: ImageCodec) {
  const [state, setState] = useState<PickState>({ status: 'idle' })

  const pick = async (file: File | undefined): Promise<string | null> => {
    if (!file) return null
    setState({ status: 'working' })
    try {
      const url = await store.put(await resizePhoto(file, codec))
      // Never keep anything the site record would refuse to load later.
      if (!photoUrlSchema.safeParse(url).success) throw new PhotoError('That photo is too detailed to store. Try a smaller or simpler one.')
      setState({ status: 'idle' })
      return url
    } catch (err) {
      const message = err instanceof PhotoError ? err.message : 'Something went wrong with that photo. Try another one.'
      if (!(err instanceof PhotoError)) console.error('Photo processing failed', err)
      setState({ status: 'error', message })
      return null
    }
  }

  return { state, pick }
}
