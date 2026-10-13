import { useEffect } from 'react'
import { ApiError } from '../api/client'
import type { Api } from '../api/client'
import { AccountShell } from '../builder/account/AccountShell'
import { DownloadSite } from './DownloadSite'

interface Props {
  api: Api
  /** The edit link's token from #download=…; '' when the link had none. */
  token: string
}

const REPLACED = 'This link has been replaced by a newer one. Use the newest link we’ve emailed you, or ask for a new one below.'

/**
 * The welcome email's "Download your site" link: one button, no builder. Without a key (a link
 * from a closed site's page, say) it points to a new edit link, which brings a download link too.
 */
export function DownloadScreen({ api, token }: Props) {
  // The key stays in memory only: out of the address bar and the browser's history.
  useEffect(() => {
    if (!token) return
    try {
      window.history.replaceState(null, '', `${window.location.pathname}#download`)
    } catch {
      // Left as is.
    }
  }, [token])

  const newLink = <a className="sb-line-btn ba-btn" href="#lost-link">Email me a new link</a>
  if (!token) {
    return (
      <AccountShell title="Download your site">
        <p>Open the <b>Download your site</b> link in your welcome email, or ask for a new link: we’ll email it to the address you paid with.</p>
        {newLink}
      </AccountShell>
    )
  }
  const load = () => api.exportSite(token).catch(err => {
    throw err instanceof ApiError && err.status === 401 ? new Error(REPLACED) : err
  })
  return (
    <AccountShell title="Download your site">
      <p>Your whole site in one .zip file: the pages, your photos at full quality, and the fonts. Open index.html to see it on your computer, or put it online anywhere.</p>
      <DownloadSite load={load} className="sb-main-btn ba-btn" />
      <p className="ba-small">Link not working? <a href="#lost-link">Email me a new link</a></p>
    </AccountShell>
  )
}
