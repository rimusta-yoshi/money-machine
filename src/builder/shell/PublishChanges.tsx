import { useState } from 'react'
import { ApiError } from '../../api/client'
import type { Site } from '../../site/schema'

interface Props {
  /** Measures every section on real screens first: the checked record, or null if that failed. */
  verify: () => Promise<Site | null>
  /** Re-publishes the paid site at its own address (free). Resolves to the live address. */
  publish: (checked: Site) => Promise<string>
  /** What's missing before anything can go live (e.g. the business name), or null. */
  missing?: () => string | null
}

type State = { kind: 'idle' } | { kind: 'busy' } | { kind: 'done'; url: string } | { kind: 'error'; message: string }

/**
 * "Publish changes" for a site that's already paid for and live, in the top bar so it
 * works from any step. Every section is checked first, exactly as at the go-live step;
 * sample photos are never published (those sections go live without them).
 */
export function PublishChanges({ verify, publish, missing }: Props) {
  const [state, setState] = useState<State>({ kind: 'idle' })
  const busy = state.kind === 'busy'

  const run = async () => {
    if (busy) return
    const gap = missing?.()
    if (gap) return setState({ kind: 'error', message: gap })
    setState({ kind: 'busy' })
    try {
      const checked = await verify()
      if (!checked) throw new Error('Checking the site failed')
      setState({ kind: 'done', url: await publish(checked) })
    } catch (err) {
      setState({ kind: 'error', message: err instanceof ApiError ? err.message : 'We couldn’t publish just now. Please try again.' })
    }
  }

  return (
    <div className="bt-publish">
      <button type="button" className="sb-main-btn bt-publish-btn" onClick={run} aria-disabled={busy || undefined}>
        {busy ? 'Publishing…' : 'Publish changes'}
      </button>
      <p className={`bt-publish-status${state.kind === 'error' ? ' is-error' : ''}`} role="status" aria-live="polite">
        {state.kind === 'done' && <>Your changes are live. <a href={state.url} target="_blank" rel="noopener noreferrer">View your site<span className="sb-sr-only"> (opens in a new tab)</span></a></>}
        {state.kind === 'error' && state.message}
      </p>
    </div>
  )
}
