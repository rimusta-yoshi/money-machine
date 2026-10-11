import { useState } from 'react'
import { apiBase } from '../api/client'
import { Logo } from '../brand/Logo'
import { Dashboard } from './Dashboard'
import { KeyForm } from './KeyForm'

/**
 * The private admin dashboard (/admin/). The page sits behind Cloudflare Access; the numbers
 * need the admin key too, which is kept for this browser tab only.
 */

const API_BASE = apiBase()
const KEY_STORE = 'siteblocks.admin'

function storedKey(): string {
  try {
    return globalThis.sessionStorage?.getItem(KEY_STORE) ?? ''
  } catch {
    return ''
  }
}

function keepKey(key: string): void {
  try {
    if (key) globalThis.sessionStorage?.setItem(KEY_STORE, key)
    else globalThis.sessionStorage?.removeItem(KEY_STORE)
  } catch {
    // Asked again after a reload.
  }
}

export function AdminApp() {
  const [key, setKey] = useState(storedKey)
  const [notice, setNotice] = useState<string | null>(null)
  const signIn = (k: string) => { keepKey(k); setNotice(null); setKey(k) }
  const signOut = (why: string | null = null) => { keepKey(''); setNotice(why); setKey('') }

  return (
    <div className="sb-ui ad-root">
      <header className="ad-bar">
        <Logo href="/" />
        <span className="ad-bar-title">Dashboard</span>
        {key && <button type="button" className="sb-text-btn ad-signout" onClick={() => signOut()}>Sign out</button>}
      </header>
      {!API_BASE
        ? <main className="ad-main"><h1 className="ad-h1">Dashboard</h1><p>This build has no server (VITE_API_URL is not set), so there are no numbers to show.</p></main>
        : key
          ? <Dashboard base={API_BASE} adminKey={key} onRefused={message => signOut(message)} />
          : <KeyForm notice={notice} onKey={signIn} />}
    </div>
  )
}
