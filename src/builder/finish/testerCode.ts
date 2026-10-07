/**
 * Before launch, checkouts need a tester code: typed on the go-live step, or in a link
 * (/build/?tester=…). It's kept for this browser tab only, and taken out of the address bar.
 */

const STORAGE_KEY = 'siteblocks.tester'

export function storedTesterCode(storage: Pick<Storage, 'getItem'> | undefined = globalThis.sessionStorage): string {
  try {
    return storage?.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function keepTesterCode(code: string, storage: Pick<Storage, 'setItem'> | undefined = globalThis.sessionStorage): void {
  try {
    storage?.setItem(STORAGE_KEY, code)
  } catch {
    // Typed again next time.
  }
}

/** Keeps a ?tester= code from the address and removes it from the address bar. */
export function takeTesterCodeFromUrl(): void {
  try {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('tester')?.trim()
    if (code === undefined) return
    if (code) keepTesterCode(code.slice(0, 100))
    url.searchParams.delete('tester')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  } catch {
    // Nothing taken.
  }
}
