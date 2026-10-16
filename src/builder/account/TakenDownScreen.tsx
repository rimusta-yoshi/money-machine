import { BRAND } from '../../brand/config'
import { AccountShell } from './AccountShell'

interface Props {
  /** Where to write, as the server says (SUPPORT_EMAIL); the brand's address if it didn't say. */
  support?: string
}

/**
 * What an edit link (or this browser's own copy) opens once we've taken the site down for
 * breaking our terms: no editor, just who to contact. Nothing has been deleted.
 */
export function TakenDownScreen({ support = BRAND.email }: Props) {
  return (
    <AccountShell title="Your site has been taken down">
      <p>It breaks our terms, so it’s no longer online and can’t be changed for now.</p>
      <p>If you think this is a mistake, email <a href={`mailto:${support}`}>{support}</a> and we’ll look at it again.</p>
    </AccountShell>
  )
}
