import { PAGES } from '../brand/config'

/** One of our plain pages: its words in content/, its built HTML entry and its look. */
export interface StaticPage {
  /** Where it's served, with the trailing slash. */
  path: string
  /** The Markdown, from the repo root. */
  source: string
  /** The HTML entry Vite builds it from (filled in by vite.config.ts). */
  entry: string
  /** The browser tab and search result title (the brand is added after it). */
  title: string
  description: string
  /** The title tile's colour (Block Party). */
  tone: 'blue' | 'yellow' | 'lawn'
  /** The small line above the title. */
  kicker: string
}

export const STATIC_PAGES: readonly StaticPage[] = [
  {
    path: PAGES.privacy, source: 'content/legal/privacy.md', entry: 'privacy/index.html', tone: 'blue', kicker: 'The small print, in plain English',
    title: 'Privacy policy', description: 'What we collect to build, host and support your website, why, who we share it with and how long we keep it.',
  },
  {
    path: PAGES.terms, source: 'content/legal/terms.md', entry: 'terms/index.html', tone: 'yellow', kicker: 'The small print, in plain English',
    title: 'Terms of service', description: 'What your one payment includes, the money-back guarantee, your content, and what we each agree to.',
  },
  {
    path: PAGES.hostingGuide, source: 'content/guide/host-your-own-site.md', entry: 'guide/host-your-own-site/index.html', tone: 'lawn', kicker: 'You own your site',
    title: 'Host your own site', description: 'Download your website and put it online anywhere, free, in a few minutes. Step by step, no jargon.',
  },
  {
    path: PAGES.faq, source: 'content/faq.md', entry: 'faq/index.html', tone: 'blue', kicker: 'Fair questions, straight answers',
    title: 'Frequently asked questions', description: 'Paying once, what’s included, your own domain, changes, downloads, refunds, and what happens if we ever close.',
  },
]
