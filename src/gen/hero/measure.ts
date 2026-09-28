import type { HeroSpec, SiteStyle } from '../schema'
import type { HeroContent } from './content'

/** Layout facts the hard checks need. Only a measurer produces these. */
export interface HeroMeasurement {
  desktop: { headlineLines: number; heightPx: number }
  phone: {
    headlineLines: number
    /** Bottom of the call button, from the top of the hero. */
    callBottomPx: number
    /** Anything wider than the phone (it would be clipped or scroll sideways). */
    overflowsWidth: boolean
  }
  /** Height of the smallest link, button or field, across both frames. */
  minTapPx: number
}

export interface MeasureInput {
  spec: HeroSpec
  style: SiteStyle
  content: HeroContent
  html: string
}

/**
 * The generator's only window onto layout. The browser uses the DOM adapter
 * (src/gen/dom/measure.ts); anywhere else, the estimator.
 */
export interface Measurer {
  measure(input: MeasureInput): HeroMeasurement
}
