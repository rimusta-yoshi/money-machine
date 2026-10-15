import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/client'
import type { Api, DomainAnswer } from '../api/client'

/**
 * The own-domain page's state: loads on open, asks again whenever the customer comes back to
 * the page (from their domain company's tab, say), and gently once a minute while it waits.
 * The server asks Cloudflare at most every 15 seconds whatever we do.
 */

const WAITING_EVERY_MS = 60_000
/** Coming back to the tab twice in a row asks once. */
const MIN_GAP_MS = 5_000

export type DomainState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string; status: number }
  | { phase: 'ready'; answer: DomainAnswer }

const messageOf = (err: unknown): string => (err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')

export function useOwnDomain(api: Api, key: string) {
  const [state, setState] = useState<DomainState>({ phase: 'loading' })
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const last = useRef(0)

  const load = useCallback(async () => {
    last.current = Date.now()
    setChecking(true)
    try {
      setState({ phase: 'ready', answer: await api.domain(key) })
    } catch (err) {
      // A failed re-check keeps what's on screen; only a first load shows the error.
      setState(s => (s.phase === 'ready' && !(err instanceof ApiError && err.status === 401) ? s : { phase: 'error', message: messageOf(err), status: err instanceof ApiError ? err.status : 0 }))
    } finally {
      setChecking(false)
    }
  }, [api, key])

  useEffect(() => { void load() }, [load])

  const waiting = state.phase === 'ready' && state.answer.domain?.status === 'pending'
  useEffect(() => {
    const again = () => {
      if (document.visibilityState === 'visible' && Date.now() - last.current > MIN_GAP_MS) void load()
    }
    document.addEventListener('visibilitychange', again)
    window.addEventListener('focus', again)
    const timer = waiting ? window.setInterval(again, WAITING_EVERY_MS) : undefined
    return () => {
      document.removeEventListener('visibilitychange', again)
      window.removeEventListener('focus', again)
      window.clearInterval(timer)
    }
  }, [load, waiting])

  /** Runs a change; resolves to an error message for the form, or null when it worked. */
  const change = useCallback(async (run: () => Promise<DomainAnswer>): Promise<string | null> => {
    setBusy(true)
    try {
      setState({ phase: 'ready', answer: await run() })
      return null
    } catch (err) {
      return messageOf(err)
    } finally {
      setBusy(false)
    }
  }, [])

  const connect = useCallback((domain: string) => change(() => api.connectDomain(key, domain)), [api, key, change])
  const disconnect = useCallback(() => change(() => api.disconnectDomain(key)), [api, key, change])

  return { state, busy, checking, recheck: load, connect, disconnect }
}
