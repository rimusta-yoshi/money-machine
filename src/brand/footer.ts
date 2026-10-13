import { BRAND, PAGES } from './config'

/** The footer links on every page of ours: the homepage, the plain pages and the builder. */
export const FOOTER_LINKS = [
  { href: PAGES.privacy, label: 'Privacy' },
  { href: PAGES.terms, label: 'Terms' },
  { href: PAGES.hostingGuide, label: 'Host your own site' },
  { href: `mailto:${BRAND.email}`, label: 'Contact' },
] as const
