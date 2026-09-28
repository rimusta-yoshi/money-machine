import { useMemo } from 'react'
import { GEN_CSS, renderSection } from '../../gen'
import type { HeroContent, HeroSpec, SiteStyle } from '../../gen'

/** The generator stylesheet. React hoists it into <head> once, however many heroes render. */
export function GenStyles() {
  return <style href="sb-gen-css" precedence="default">{GEN_CSS}</style>
}

interface Props {
  spec: HeroSpec
  style: SiteStyle
  content: HeroContent
}

/**
 * Shows a generated hero exactly as it will be published: the generator's HTML string.
 * Safe to inject because the renderer escapes all content and only emits schema-checked values.
 */
export function GeneratedHero({ spec, style, content }: Props) {
  const html = useMemo(() => renderSection(spec, style, content), [spec, style, content])
  return (
    <>
      <GenStyles />
      <div className="ff-generated" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  )
}
