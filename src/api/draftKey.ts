/**
 * The draft key lives in this browser (localStorage). After paying, an edit link from the
 * welcome email can stand in for it on any device: the link keeps its token after the #, so
 * it never reaches a server log. Storage can be missing or blocked (private windows), so every
 * access is guarded and a missing key just means a new draft.
 */

const STORAGE_KEY = 'siteblocks.draft'
/** A draft key (this browser's own) or an edit link's token (edit.<ref>.<signature>). */
const KEY_SHAPE = /^([A-Za-z0-9_-]{43}|edit\.[0-9a-f]{32}\.[A-Za-z0-9_-]{43})$/
const REFUND_SHAPE = /^refund\.[0-9a-f]{32}\.[A-Za-z0-9_-]{43}$/

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
    // Not stored: the edit link still works.
  }
}

export function forgetDraftKey(storage: Pick<Storage, 'removeItem'> | undefined = globalThis.localStorage): void {
  try {
    storage?.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to forget.
  }
}

const fromHash = (hash: string, name: string, shape: RegExp): string | null => {
  const v = new URLSearchParams(hash.replace(/^#/, '')).get(name)
  return v && shape.test(v) ? v : null
}

/** The token from an edit link's hash (#edit=<token>), if it holds one. */
export const editTokenFromHash = (hash: string): string | null => {
  const t = fromHash(hash, 'edit', KEY_SHAPE)
  return t?.startsWith('edit.') ? t : null
}

/** The token from a refund link's hash (#refund=<token>). */
export const refundTokenFromHash = (hash: string): string | null => fromHash(hash, 'refund', REFUND_SHAPE)

/** Drops a used token from the address bar, so it isn't bookmarked or shared by accident. */
export function clearHash(): void {
  try {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  } catch {
    // Left as is.
  }
}
