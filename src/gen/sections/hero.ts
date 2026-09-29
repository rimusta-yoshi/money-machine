import type { SectionDef } from '../core/types'
import { heroView } from '../content'
import type { HeroContent } from '../hero/content'
import { ARCHETYPES, FALLBACK_SPEC } from '../hero/archetypes'
import { measuredChecks, staticChecks } from '../hero/checks'
import { estimateHero } from '../hero/estimate'
import { renderHero } from '../hero/render'
import { scoreHero } from '../hero/score'
import { heroSpecSchema } from '../schema'
import type { HeroSpec, ThemeKey } from '../schema'
import { THEMES } from '../themes'

const weights = Object.fromEntries(Object.entries(THEMES).map(([k, t]) => [k, t.hero])) as Record<ThemeKey, Record<string, number>>

/**
 * The hero as a generic section. It keeps its own checks (call button above the fold,
 * overlap) and its own background (tone param or photo), which the rhythm layer respects.
 */
export const hero: SectionDef<HeroSpec, HeroContent> = {
  type: 'hero',
  label: 'Hero',
  view: heroView,
  archetypes: ARCHETYPES as unknown as SectionDef<HeroSpec, HeroContent>['archetypes'],
  weights,
  schema: heroSpecSchema,
  fallback: FALLBACK_SPEC,
  checkBands: ['ground'],
  fixedBand: spec => {
    if (spec.archetype === 'overlay' || spec.archetype === 'card') return 'photo'
    if (spec.archetype === 'offset') return 'ground'
    return spec.params.tone
  },
  render: (spec, style, content) => renderHero(spec, style, content),
  staticChecks: (spec, style) => staticChecks(spec, style),
  measuredChecks,
  estimate: estimateHero,
  score: scoreHero,
}
