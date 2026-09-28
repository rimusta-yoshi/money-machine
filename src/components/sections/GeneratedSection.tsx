import { useMemo } from 'react'
import { GEN_CSS, renderPageSection } from '../../gen'
import type { PageContent, ResolvedSection, SiteStyle } from '../../gen'

/** The generator stylesheet. React hoists it into <head> once, however many sections render. */
export function GenStyles() {
  return <style href="sb-gen-css" precedence="default">{GEN_CSS}</style>
}

interface Props {
  section: Pick<ResolvedSection, 'type' | 'spec' | 'rhythm'>
  style: SiteStyle
  content: PageContent
}

/**
 * One generated section, exactly as it will be published: the generator's HTML string.
 * Safe to inject because the renderer escapes all content and only emits schema-checked values.
 */
export function GeneratedSection({ section, style, content }: Props) {
  const html = useMemo(() => renderPageSection(section, style, content), [section, style, content])
  return (
    <>
      <GenStyles />
      <div className="sb-generated" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  )
}
