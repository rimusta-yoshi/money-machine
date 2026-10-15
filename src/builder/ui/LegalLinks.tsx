import { FOOTER_LINKS } from '../../brand/footer'
import { PAGES } from '../../brand/config'

const NEW_TAB = <span className="sb-sr-only"> (opens in a new tab)</span>

/** A page of ours in a new tab, so the site being built stays open. */
export function NewTabLink({ href, children }: { href: string; children: string }) {
  return <a href={href} target="_blank" rel="noopener">{children}{NEW_TAB}</a>
}

/** The builder's footer links (FAQ, the trades, privacy, terms, the hosting guide, contact), each in a new tab. */
export function LegalLinks() {
  return (
    <nav aria-label="Footer" className="b-legal">
      {FOOTER_LINKS.map(l => (l.href.startsWith('mailto:')
        ? <a key={l.href} href={l.href}>{l.label}</a>
        : <NewTabLink key={l.href} href={l.href}>{l.label}</NewTabLink>))}
    </nav>
  )
}

/** "By paying you agree to our terms and privacy policy", under the Go live button. */
export function AgreeLine() {
  return (
    <p className="bg-small bg-center">
      By paying you agree to our <NewTabLink href={PAGES.terms}>terms</NewTabLink> and <NewTabLink href={PAGES.privacy}>privacy policy</NewTabLink>.
    </p>
  )
}
