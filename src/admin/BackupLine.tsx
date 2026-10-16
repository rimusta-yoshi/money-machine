import { useEffect, useState } from 'react'
import { fetchBackupHealth } from './backupApi'
import type { BackupHealth } from './backupApi'

/** "Last backup: 16 Oct 2026, 03:47 ✓" at the top of the dashboard (server/core/backup). */

const when = (t: number): string =>
  new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

type Load = { state: 'loading' } | { state: 'ok'; health: BackupHealth } | { state: 'error'; message: string }

interface Props { base: string; adminKey: string; refresh: unknown }

export function BackupLine({ base, adminKey, refresh }: Props) {
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  useEffect(() => {
    let live = true
    fetchBackupHealth(base, adminKey).then(
      health => { if (live) setLoad({ state: 'ok', health }) },
      err => { if (live) setLoad({ state: 'error', message: err instanceof Error ? err.message : 'The backup status could not be loaded.' }) },
    )
    return () => { live = false }
  }, [base, adminKey, refresh])

  if (load.state === 'loading') return <p className="ad-note">Last backup: checking…</p>
  if (load.state === 'error') return <p className="ad-note">Last backup: ✗ {load.message}</p>
  const { healthy, lastBackupAt, problems } = load.health
  return (
    <p className="ad-note" title={problems.join(' ')}>
      Last backup: {lastBackupAt ? when(lastBackupAt) : 'never'}{' '}
      <span role="img" aria-label={healthy ? 'working' : 'not working'}>{healthy ? '✓' : '✗'}</span>
      {!healthy && problems.length > 0 && <> {problems[0]}</>}
    </p>
  )
}
