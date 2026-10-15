import { cleanRequestedType } from './requested'

/** Sends a request to the server (POST /v1/requested-types). Fire-and-forget: failures are ignored. */
export function sendRequestedType(base: string | null, text: string, closest: string | null, fetcher: typeof fetch = (...a) => fetch(...a)): void {
  const clean = cleanRequestedType(text)
  if (!base || !clean) return
  try {
    // Plain text, so the browser sends it straight away (no preflight), as the funnel events do.
    void fetcher(`${base}/v1/requested-types`, {
      method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ text: clean, ...(closest ? { closest } : {}) }), keepalive: true,
    }).catch(() => undefined)
  } catch {
    // Not counted.
  }
}
