import type { SaveStatus } from '../../api/useDraft'

interface Props {
  status: SaveStatus
  onRetry: () => void
}

/** "Saved" / "Saving…" / "Not saved · Retry" in the top bar. Announced politely to screen readers. */
export function SaveStatusChip({ status, onRetry }: Props) {
  const text = status.state === 'saving' ? 'Saving…' : status.state === 'saved' ? 'Saved' : status.state === 'error' ? 'Not saved' : ''
  return (
    <div className={`mm-save-chip mm-save-chip--${status.state}`}>
      <span role="status" aria-live="polite" title={status.state === 'error' ? status.message : undefined}>{text}</span>
      {status.state === 'error' && <button type="button" onClick={onRetry}>Retry</button>}
    </div>
  )
}
