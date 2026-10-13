import { useState } from 'react'
import { ApiError } from '../api/client'
import type { SiteExport } from '../publish/siteZip'
import { PAGES } from '../brand/config'
import { NewTabLink } from '../builder/ui/LegalLinks'
import { buildSiteZip } from '../publish/siteZip'
import { saveZip } from './saveZip'

interface Props {
  /** Asks the server for the site's files (with the draft key or edit link). */
  load: () => Promise<SiteExport>
  /** Swapped in tests. */
  save?: (bytes: Uint8Array, name: string) => void
  fetcher?: (url: string) => Promise<Response>
  className?: string
}

type State = { kind: 'idle' } | { kind: 'busy' } | { kind: 'done'; name: string } | { kind: 'error'; message: string }

/** "Download your site": a .zip of exactly what's live, with a link to the hosting guide. */
export function DownloadSite({ load, save = saveZip, fetcher, className = 'sb-line-btn' }: Props) {
  const [state, setState] = useState<State>({ kind: 'idle' })
  const busy = state.kind === 'busy'

  const run = async () => {
    if (busy) return
    setState({ kind: 'busy' })
    try {
      const exp = await load()
      save(await buildSiteZip(exp, fetcher), exp.name)
      setState({ kind: 'done', name: exp.name })
    } catch (err) {
      setState({ kind: 'error', message: err instanceof ApiError || err instanceof Error ? err.message : 'The download didn’t work. Please try again.' })
    }
  }

  return (
    <div className="dl">
      <button type="button" className={className} onClick={run} aria-disabled={busy || undefined}>
        {busy ? 'Preparing your download…' : 'Download your site'}
      </button>
      <p className={`dl-status${state.kind === 'error' ? ' is-error' : ''}`} role="status" aria-live="polite">
        {state.kind === 'done' && <>Downloaded {state.name}.</>}
        {state.kind === 'error' && state.message}
      </p>
      <p className="dl-small">
        A .zip of your whole site, to keep or to host anywhere. <NewTabLink href={PAGES.hostingGuide}>How to host it yourself</NewTabLink>
      </p>
    </div>
  )
}
