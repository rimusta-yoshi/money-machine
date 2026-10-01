import { describe, expect, it } from 'vitest'
import { estimateMeasurer, generateOptions, resolvePage, sectionPresent, resolveSiteStyle, rhythmOf, SECTIONS, THEMES, viewOf } from '../gen'
import type { Band, SavedSections, SectionKey, ThemeKey } from '../gen'
import { withSample } from '../sample/content'
import { tradeById } from '../trades'
import { createSite } from './defaults'
import { pageOrder } from './page'
import { pageContent } from './pageContent'
import { siteReducer } from './reducer'

const electrician = tradeById.electrician
const photo = (n: number) => ({ url: `https://example.com/p${n}.jpg`, alt: `Job ${n}` })
const isLoud = (type: SectionKey, band: Band) => band === 'brand' || (band === 'ink' && !SECTIONS[type].fixedBand)

describe('browsing one section never flips an earlier pick’s band', () => {
  const site = createSite(electrician, 3)
  const why = (t: ThemeKey) => THEMES[t].voice.why
  for (const theme of Object.keys(THEMES) as ThemeKey[]) {
    it(`${theme}: sections above the one being browsed keep their bands`, () => {
      for (let seed = 1; seed <= 4; seed++) {
        const content = withSample(pageContent(site, electrician), [1, 2, 3, 4, 5].map(photo), why(theme))
        const style = resolveSiteStyle(theme, '#D97706', seed)
        const base = { order: pageOrder(electrician, site), content, style, styleSeed: seed, measurer: estimateMeasurer }
        // Every section picked at its default, as after a full pass through the builder.
        const first = resolvePage({ ...base, saved: {} })
        const saved: SavedSections = Object.fromEntries(first.map(s => [s.type, { seed: s.seed, spec: s.spec }]))
        const prior = rhythmOf(first)
        first.forEach((browsed, at) => {
          const { shown } = generateOptions(SECTIONS[browsed.type], { batchSeed: browsed.seed, content: viewOf(browsed.type, content), style, measurer: estimateMeasurer, show: 6 })
          for (const option of shown) {
            const page = resolvePage({ ...base, saved, prior, overrides: { [browsed.type]: option.spec } })
            page.slice(0, at).forEach(s => {
              const was = prior[s.type]!.band
              const where = `${seed}: browsing ${browsed.type} (${option.spec.archetype}) changed ${s.type}`
              expect(isLoud(s.type, s.rhythm.band), where).toBe(isLoud(s.type, was))
              // Only the footer's own band can nudge the section right above it.
              if (browsed.type !== 'footer') expect(s.rhythm.band, where).toBe(was)
            })
          }
        })
      }
    })
  }

  it('the saved rhythm matches what the builder showed once the pick is made', () => {
    let s = siteReducer(null, { type: 'pickTrade', trade: electrician })!
    for (const type of pageOrder(electrician, s)) {
      const content = pageContent(s, electrician)
      if (!sectionPresent(type, content)) continue
      const { shown } = generateOptions(SECTIONS[type], { batchSeed: 99, content: viewOf(type, content), style: s.style.resolved, measurer: estimateMeasurer, show: 3 })
      const spec = shown.at(-1)?.spec
      if (!spec) continue
      const preview = resolvePage({ order: pageOrder(electrician, s), saved: s.sections, content, style: s.style.resolved, styleSeed: s.style.seed, prior: s.rhythm, overrides: { [type]: spec } })
      s = siteReducer(s, { type: 'pickSection', section: type, value: { seed: 99, spec } })!
      expect(s.rhythm).toEqual(rhythmOf(preview))
    }
  })

  it('a theme change starts the rhythm afresh', () => {
    const s = siteReducer(null, { type: 'pickTrade', trade: electrician })!
    const next = siteReducer(s, { type: 'setTheme', theme: s.style.theme === 'workwear' ? 'clean-pro' : 'workwear' })!
    const fresh = resolvePage({ order: pageOrder(electrician, next), saved: next.sections, content: pageContent(next, electrician), style: next.style.resolved, styleSeed: next.style.seed })
    expect(next.rhythm).toEqual(rhythmOf(fresh))
  })
})
