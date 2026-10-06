import type { EditConflict } from '../../api/useDraft'
import { AccountShell } from './AccountShell'

interface Props {
  conflict: EditConflict
  /** True opens the edit link's site, false keeps the one in this browser. */
  onChoose: (openLink: boolean) => void
}

const named = (name: string, fallback: string) => (name.trim() ? `“${name.trim()}”` : fallback)

/**
 * An edit link opened in a browser that is building a different site. This browser keeps one
 * site at a time, so it asks before replacing it rather than losing work.
 */
export function EditLinkChoice({ conflict, onChoose }: Props) {
  const link = named(conflict.link, 'your paid site')
  const here = named(conflict.here, 'the site you’re building here')
  return (
    <AccountShell title={`Open ${link}?`}>
      <p>This browser is already building {here}. Opening your edit link replaces it here, and it can’t be brought back unless you’ve paid for it too.</p>
      <button type="button" className="sb-main-btn ba-btn" onClick={() => onChoose(true)}>Open {link}</button>
      <button type="button" className="sb-line-btn ba-btn" onClick={() => onChoose(false)}>Keep building {here}</button>
      <p className="ba-small">Tip: open the edit link in another browser, or a private window, to keep both.</p>
    </AccountShell>
  )
}
