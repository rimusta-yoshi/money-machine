import { useEffect, useState } from 'react'
import { refundTokenFromHash } from '../../api/draftKey'

/** Which page the builder's address is asking for: the builder itself, or a page around paying. */
export type Screen =
  | { kind: 'builder'; cancelled: boolean }
  | { kind: 'paid'; sessionId: string }
  | { kind: 'refund'; token: string }
  | { kind: 'lost-link' }

const SESSION = /^cs_(test|live)_[A-Za-z0-9]{10,250}$/

export function screenFrom(loc: { search: string; hash: string }): Screen {
  const q = new URLSearchParams(loc.search)
  const paid = q.get('paid')
  if (paid && SESSION.test(paid)) return { kind: 'paid', sessionId: paid }
  const refund = refundTokenFromHash(loc.hash)
  if (refund) return { kind: 'refund', token: refund }
  if (loc.hash === '#lost-link') return { kind: 'lost-link' }
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
