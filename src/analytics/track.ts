import type { ClientStep } from './funnel'
import type { Source } from './source'

/**
 * Reports funnel steps and layout picks to the server (POST /v1/events) for the admin
 * dashboard. Fire-and-forget: never awaited, failures ignored, nothing kept in the browser.
 * Each step is sent once per page load. Automated browsers (navigator.webdriver) send nothing.
 */

export interface Facts {
  trade?: string
  theme?: string
  /** The draft key, once the builder has one: the server turns it into the site's random id. */
  draftKey?: string | null
}

export interface Tracker {
  step: (step: ClientStep, facts?: Facts) => void
  layout: (section: string, layout: string, facts?: Facts) => void
}

/** A draft key (43 characters); edit-link tokens aren't sent. */
const DRAFT_KEY = /^[A-Za-z0-9_-]{43}$/

const automated = (): boolean => {
  try {
    return typeof navigator !== 'undefined' && navigator.webdriver === true
  } catch {
    return false
  }
}

export function createTracker(base: string | null, source: Source, fetcher: typeof fetch = (...a) => fetch(...a)): Tracker {
  const sent = new Set<ClientStep>()
  const off = !base || automated()

  const send = (body: Record<string, unknown>, facts: Facts) => {
    if (off) return
    const key = facts.draftKey && DRAFT_KEY.test(facts.draftKey) ? facts.draftKey : null
    // Without a key it goes as plain text, so the browser sends it straight away (no preflight).
    const headers: Record<string, string> = key ? { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` } : { 'Content-Type': 'text/plain' }
    const payload = { ...body, trade: facts.trade, theme: facts.theme, src: source.src ?? undefined, campaign: source.campaign ?? undefined }
    try {
      void fetcher(`${base}/v1/events`, { method: 'POST', headers, body: JSON.stringify(payload), keepalive: true }).catch(() => undefined)
    } catch {
      // Not counted.
    }
  }

  return {
    step: (step, facts = {}) => {
      if (sent.has(step)) return
      sent.add(step)
      send({ kind: 'step', step }, facts)
    },
    layout: (section, layout, facts = {}) => send({ kind: 'layout', section, layout }, facts),
  }
}

/** Does nothing: for builds without a server. */
export const NO_TRACKER: Tracker = { step: () => undefined, layout: () => undefined }
