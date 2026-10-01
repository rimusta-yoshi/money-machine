import { useMemo } from 'react'
import { defaultSpec, estimateMeasurer, sectionBatch, SECTIONS, THEMES, viewOf } from '../gen'
import type { PageContent, SectionKey } from '../gen'
import { withSample } from '../sample/content'
import { samplePhotos } from '../sample/photos'
import type { Site } from '../site/schema'
import { GeneratedSection } from '../components/sections/GeneratedSection'

interface Props {
  type: SectionKey
  site: Site
  content: PageContent
  /** What to add to show the section, e.g. "Add your customer reviews to show this." */
  needs: string
}

/**
 * A faded, clearly labelled example of a section the customer hasn't filled in yet, so they
 * can see what it would add. Builder only: it uses sample content, is hidden from screen
 * readers and interaction, and never reaches the site record or a published page.
 */
export function ExampleSection({ type, site, content, needs }: Props) {
  const style = site.style.resolved
  const example = useMemo(() => {
    const sample = withSample(content, samplePhotos(), THEMES[style.theme].voice.why)
    const def = SECTIONS[type]
    const spec = defaultSpec(def, sectionBatch(site.style.seed, type), viewOf(type, sample), style, estimateMeasurer)
    return { sample, spec }
  }, [type, content, style, site.style.seed])

  return (
    <div className="mm-example">
      <p className="mm-example-label"><b>Example</b> · {needs}</p>
      <div className="mm-example-body" aria-hidden="true" inert>
        <GeneratedSection section={{ type, spec: example.spec, rhythm: { band: 'ground', side: 'right', motif: true } }} style={style} content={example.sample} />
      </div>
    </div>
  )
}
