import { useEffect, useState } from 'react'
import { domainTokenFromHash, downloadTokenFromHash, refundTokenFromHash } from '../../api/draftKey'

/** Back from the customer's domain company (Domain Connect): approved, or not finished there. */
export type DomainReturn = 'done' | 'cancelled' | null

/** Which page the builder's address is asking for: the builder itself, or a page around paying. */
export type Screen =
  | { kind: 'builder'; cancelled: boolean }
  | { kind: 'paid'; sessionId: string }
  | { kind: 'refund'; token: string }
  | { kind: 'lost-link' }
  /** "Download your site" from the welcome email; token '' when the link carried none. */
  | { kind: 'download'; token: string }
  /** "Use your own domain"; token '' to use this browser's key. */
  | { kind: 'domain'; token: string; back: DomainReturn }

const SESSION = /^cs_(test|live)_[A-Za-z0-9]{10,250}$/

export function screenFrom(loc: { search: string; hash: string }): Screen {
  const q = new URLSearchParams(loc.search)
  const paid = q.get('paid')
  if (paid && SESSION.test(paid)) return { kind: 'paid', sessionId: paid }
  const refund = refundTokenFromHash(loc.hash)
  if (refund) return { kind: 'refund', token: refund }
  if (loc.hash === '#lost-link') return { kind: 'lost-link' }
  const download = downloadTokenFromHash(loc.hash)
  if (download !== null) return { kind: 'download', token: download }
  // The domain company sends people back to /build/?domain=back (with error=… if they didn't approve).
  if (q.get('domain') === 'back') return { kind: 'domain', token: '', back: q.get('error') ? 'cancelled' : 'done' }
  const domain = domainTokenFromHash(loc.hash)
  if (domain !== null) return { kind: 'domain', token: domain, back: null }
  return { kind: 'builder', cancelled: q.get('checkout') === 'cancelled' }
}

/** The screen for the current address, following in-page links (#lost-link). */
export function useScreen(): Screen {
  const [screen, setScreen] = useState(() => screenFrom(window.location))
  useEffect(() => {
    const onHash = () => setScreen(screenFrom(window.location))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return screen
}
