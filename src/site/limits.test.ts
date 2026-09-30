import { describe, expect, it } from 'vitest'
import { estimateMeasurer, generateOptions, resolveSiteStyle, SECTIONS, THEME_KEYS, viewOf } from '../gen'
import type { Candidate } from '../gen'
import { trades } from '../trades'
import { createSite } from './defaults'
import { LIMITS } from './limits'
import { pageOrder } from './page'
import { pageContent } from './pageContent'
import { parseSite } from './parse'
import type { Site } from './schema'

/** Real words, repeated to the limit: the longest text a customer could plausibly type. */
const fill = (max: number, words = 'Knaresborough Wolverhampton Stoke Newington') => {
  let s = ''
  for (const w of words.split(' ').concat(words.split(' '), words.split(' '), words.split(' '), words.split(' '))) {
    const next = s ? `${s} ${w}` : w
    if (next.length > max) break
    s = next
  }
  return s
}
const exact = (max: number) => fill(max).padEnd(max, 'x').slice(0, max)

function maxedSite(tradeIdx: number, seed: number): Site {
  const trade = trades[tradeIdx]
  const base = createSite(trade, seed)
  return {
    ...base,
    business: {
      name: fill(LIMITS.name), phone: '0113 496 0000', location: fill(LIMITS.location), about: fill(LIMITS.about),
      yearsInBusiness: '1000', email: 'firstname.lastname@a-long-business-name.co.uk',
    },
    extras: ['reviews'],
    content: {
      badges: Array.from({ length: 8 }, () => fill(LIMITS.badge)),
      whyUs: Array.from({ length: 6 }, () => ({ title: fill(LIMITS.whyTitle), text: fill(LIMITS.whyText) })),
      certsNote: fill(LIMITS.certsNote),
      areas: Array.from({ length: 16 }, () => fill(LIMITS.area)),
      hours: Array.from({ length: 8 }, () => ({ day: fill(LIMITS.hoursDay), time: fill(LIMITS.hoursTime) })),
      emergency: true,
      jobsDone: fill(LIMITS.jobsDone, '10,000+'),
      rating: { score: 4.9, count: 1200 },
      reviews: Array.from({ length: 12 }, () => ({ author: fill(LIMITS.reviewAuthor), location: fill(LIMITS.reviewLocation), text: fill(LIMITS.reviewText), rating: 5 })),
      photos: {
        hero: { url: 'https://example.com/h.jpg', alt: fill(LIMITS.photoAlt) },
        about: { url: 'https://example.com/a.jpg', alt: fill(LIMITS.photoAlt) },
        gallery: Array.from({ length: 12 }, (_, i) => ({ url: `https://example.com/g${i}.jpg`, alt: fill(LIMITS.photoAlt) })),
      },
    },
  }
}

/** Each failing check across a batch's rejected candidates, with how many candidates it failed. */
function whyRejected(rejected: readonly Candidate[]): string {
  if (!rejected.length) return 'no candidates generated'
  const counts = new Map<string, number>()
  for (const c of rejected) {
    for (const check of c.checks) {
      if (check.ok) continue
      const key = `${c.spec.archetype} · ${check.id}${check.detail ? ` (${check.detail})` : ''}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  return [...counts].map(([k, n]) => `${k} ×${n}`).join('; ')
}

describe('text limits', () => {
  it('are what the record accepts, and not a character more', () => {
    const site = createSite(trades[0], 1)
    const at = (location: string) => ({ ...site, business: { ...site.business, location } })
    expect(() => parseSite(at(exact(LIMITS.location)))).not.toThrow()
    expect(() => parseSite(at(exact(LIMITS.location + 1)))).toThrow()
  })

  // With every field full, each section (the hero included) still has at least one layout that
  // passes every hard check, under every theme, so the limits are ones the layouts can actually
  // fit. (The fallback remains as a safety net.) On failure, the rejected candidates' failing
  // checks are in the message, so the generator can be tuned.
  it.each(trades.flatMap((t, i) => THEME_KEYS.map(theme => ({ trade: t.id, i, theme }))))('$trade / $theme: every section still fits with every field at its limit', ({ i, theme }) => {
    const site = maxedSite(i, 7)
    const content = pageContent(site, trades[i])
    const style = resolveSiteStyle(theme, '#1E88E5', 7)
    const failing = pageOrder(trades[i], site).flatMap(type => {
      const { shown, rejected } = generateOptions(SECTIONS[type], { batchSeed: 3, content: viewOf(type, content), style, measurer: estimateMeasurer })
      return shown.length ? [] : [`${type}: ${whyRejected(rejected)}`]
    })
    expect(failing).toEqual([])
  })
})
