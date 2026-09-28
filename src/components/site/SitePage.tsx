import { useMemo } from 'react'
import { renderPage } from '../../gen'
import type { TradeConfig } from '../../types'
import type { Site } from '../../site/schema'
import { publishedPage } from '../../site/page'
import { pageContent } from '../../site/pageContent'
import { GenStyles } from '../sections/GeneratedSection'

interface Props {
  site: Site
  trade: TradeConfig
}

/**
 * A complete customer site: skip link, header, main content and footer, all from the
 * generator. This is the same HTML that will be published.
 */
export function SitePage({ site, trade }: Props) {
  const html = useMemo(
    () => renderPage(publishedPage(site, trade), site.style.resolved, pageContent(site, trade)),
    [site, trade],
  )
  return (
    <>
      <GenStyles />
      <div className="sb-page" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  )
}
