/**
 * The draft key lives in this browser (localStorage) and in the resume link. The link keeps
 * it after the #, so it never reaches a server log. Storage can be missing or blocked
 * (private windows), so every access is guarded and a missing key just means a new draft.
 */

const STORAGE_KEY = 'siteblocks.draft'
const KEY_SHAPE = /^[A-Za-z0-9_-]{43}$/

export function storedDraftKey(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): string | null {
  try {
    const key = storage?.getItem(STORAGE_KEY) ?? null
    return key && KEY_SHAPE.test(key) ? key : null
  } catch {
    return null
  }
}

export function rememberDraftKey(key: string, storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage): void {
  try {
    storage?.setItem(STORAGE_KEY, key)
  } catch {
    // Not stored: the resume link still works.
  }
}

export function forgetDraftKey(storage: Pick<Storage, 'removeItem'> | undefined = globalThis.localStorage): void {
  try {
    storage?.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to forget.
  }
}

/** The key from a resume link's hash (#resume=<key>), if it holds one. */
export function resumeKeyFromHash(hash: string): string | null {
  const key = new URLSearchParams(hash.replace(/^#/, '')).get('resume')
  return key && KEY_SHAPE.test(key) ? key : null
}

/** A link that reopens this draft in the builder on any device. */
export const resumeLink = (builderUrl: string, key: string): string => `${builderUrl.replace(/#.*$/, '')}#resume=${key}`
