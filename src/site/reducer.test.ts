import { describe, expect, it } from 'vitest'
import { plumber } from '../trades/plumber'
import { painter } from '../trades/painter'
import { siteReducer } from './reducer'
import type { Site } from './schema'
import { resolveSiteStyle } from '../gen'
import type { Generated } from '../gen'
import { tradeById } from '../trades'
import { withRhythm } from './page'

const PICKED_HERO: Generated = {
  seed: 42,
  spec: { v: 2, section: 'hero', archetype: 'typeled', step: 0, params: { trust: false, tone: 'ground', em: false, motif: 'none' } },
}

const PICKED_CONTACT: Generated = {
  seed: 7,
  spec: { v: 2, section: 'contact', archetype: 'band', step: 0, params: { align: 'center', brk: 'band' } },
}

const start = (): Site => {
  const s = siteReducer(null, { type: 'pickTrade', trade: plumber })
  if (!s) throw new Error('expected a site')
  return s
}

describe('siteReducer', () => {
  it('creates a site when a trade is first picked', () => {
    const s = start()
    expect(s.tradeId).toBe('plumber')
    expect(s.brandColor).toBe(plumber.colorScheme.accent)
  })

  it('keeps business details but resets layouts and trade content when switching trade', () => {
    let s = start()
    s = siteReducer(s, { type: 'setBusiness', patch: { name: 'Joe', email: 'joe@example.com' } })!
    s = siteReducer(s, { type: 'pickSection', section: 'contact', value: PICKED_CONTACT })!
    s = siteReducer(s, { type: 'pickSection', section: 'hero', value: PICKED_HERO })!
    s = siteReducer(s, { type: 'setContent', patch: { badges: ['Gas Safe'] } })!
    const switched = siteReducer(s, { type: 'pickTrade', trade: painter })!
    expect(switched.tradeId).toBe('painter')
    expect(switched.business.name).toBe('Joe')
    expect(switched.business.email).toBe('joe@example.com')
    expect(switched.sections).toEqual({})
    expect(switched.content.badges).toBeNull()
    expect(switched.brandColor).toBe(painter.colorScheme.accent)
  })

  it('keeps everything when the same trade is picked again', () => {
    const s = siteReducer(start(), { type: 'pickSection', section: 'hero', value: PICKED_HERO })!
    expect(siteReducer(s, { type: 'pickTrade', trade: plumber })).toBe(s)
  })

  it('updates business fields without touching others', () => {
    const s = siteReducer(start(), { type: 'setBusiness', patch: { phone: '0113 496 0000' } })!
    expect(s.business.phone).toBe('0113 496 0000')
    expect(s.business.name).toBe('')
  })

  it('toggles extras on and off', () => {
    const on = siteReducer(start(), { type: 'toggleExtra', extra: 'reviews' })!
    expect(on.extras).toEqual(['reviews'])
    expect(siteReducer(on, { type: 'toggleExtra', extra: 'reviews' })!.extras).toEqual([])
  })

  it('records layout picks per section', () => {
    const s = siteReducer(start(), { type: 'pickSection', section: 'contact', value: PICKED_CONTACT })!
    expect(s.sections.contact).toEqual(PICKED_CONTACT)
  })

  it('never mutates the previous state', () => {
    const s = start()
    const frozen = JSON.stringify(s)
    siteReducer(s, { type: 'setBusiness', patch: { name: 'X' } })
    siteReducer(s, { type: 'toggleExtra', extra: 'reviews' })
    siteReducer(s, { type: 'pickSection', section: 'contact', value: PICKED_CONTACT })
    siteReducer(s, { type: 'pickSection', section: 'hero', value: PICKED_HERO })
    siteReducer(s, { type: 'setTheme', theme: 'craft-heritage' })
    siteReducer(s, { type: 'rerollStyle', seed: 99 })
    siteReducer(s, { type: 'setContent', patch: { areas: ['Leeds'] } })
    siteReducer(s, { type: 'setBrandColor', color: '#000000' })
    expect(JSON.stringify(s)).toBe(frozen)
  })

  it('stores a generated hero as its batch seed plus the resolved spec', () => {
    const s = siteReducer(start(), { type: 'pickSection', section: 'hero', value: PICKED_HERO })!
    expect(s.sections.hero).toEqual(PICKED_HERO)
  })

  it('re-resolves the site style when the brand colour changes, keeping its seed', () => {
    const s = start()
    const next = siteReducer(s, { type: 'setBrandColor', color: '#0F766E' })!
    expect(next.style.seed).toBe(s.style.seed)
    expect(next.style.resolved).toEqual(resolveSiteStyle(s.style.theme, '#0F766E', s.style.seed))
  })

  it('re-resolves the site style when the theme changes', () => {
    const s = start()
    expect(s.style.theme).toBe('clean-pro')
    const next = siteReducer(s, { type: 'setTheme', theme: 'workwear' })!
    expect(next.style.theme).toBe('workwear')
    expect(next.style.resolved.theme).toBe('workwear')
    expect(next.style.seed).toBe(s.style.seed)
    expect(next.style.resolved).toEqual(resolveSiteStyle('workwear', s.brandColor, s.style.seed))
  })

  it('does nothing when the theme picked is the current one', () => {
    const s = siteReducer(start(), { type: 'pickSection', section: 'hero', value: PICKED_HERO })!
    expect(siteReducer(s, { type: 'setTheme', theme: s.style.theme })).toBe(s)
  })

  it('re-rolls the style with a new seed, keeping the theme, brand colour and picks', () => {
    let s = siteReducer(start(), { type: 'setBrandColor', color: '#0F766E' })!
    s = siteReducer(s, { type: 'setTheme', theme: 'friendly-local' })!
    s = siteReducer(s, { type: 'pickSection', section: 'hero', value: PICKED_HERO })!
    const seed = s.style.seed === 12345 ? 54321 : 12345
    const next = siteReducer(s, { type: 'rerollStyle', seed })!
    expect(next.style.seed).toBe(seed)
    expect(next.style.theme).toBe('friendly-local')
    expect(next.brandColor).toBe('#0F766E')
    expect(next.sections).toEqual(s.sections)
    expect(next.style.resolved).toEqual(resolveSiteStyle('friendly-local', '#0F766E', seed))
    expect(next.style.resolved).not.toEqual(s.style.resolved)
    expect(next.rhythm).toEqual(withRhythm(next, tradeById.plumber).rhythm)
  })

  it('re-solves the rhythm after every edit without touching any pick', () => {
    let s = siteReducer(start(), { type: 'setBusiness', patch: { phone: '0113 496 0000' } })!
    s = siteReducer(s, { type: 'pickSection', section: 'hero', value: PICKED_HERO })!
    s = siteReducer(s, { type: 'pickSection', section: 'contact', value: PICKED_CONTACT })!
    const picks = JSON.stringify(s.sections)
    const brandHero: Generated = { seed: 42, spec: { ...PICKED_HERO.spec, params: { ...PICKED_HERO.spec.params, tone: 'brand' } } as Generated['spec'] }
    const next = siteReducer(s, { type: 'pickSection', section: 'hero', value: brandHero })!
    // Only the hero changed; the contact pick is untouched, but its band moved off the brand colour.
    expect(next.sections.contact).toEqual(s.sections.contact)
    expect(JSON.stringify({ ...next.sections, hero: PICKED_HERO })).toBe(picks)
    expect(s.rhythm.contact?.band).toBe('brand')
    expect(next.rhythm.hero?.band).toBe('brand')
    expect(next.rhythm.contact?.band).not.toBe('brand')
    expect(next.rhythm).toEqual(withRhythm(next, tradeById.plumber).rhythm)
  })

  it('keeps the customer’s pick as preferred through a repair, and a new pick clears it', () => {
    const repaired: Generated = { seed: 7, spec: { v: 2, section: 'contact', archetype: 'details', step: 0, params: { brk: 'band' } }, preferred: PICKED_CONTACT.spec }
    let s = siteReducer(start(), { type: 'pickSection', section: 'contact', value: PICKED_CONTACT })!
    s = siteReducer(s, { type: 'repairSection', section: 'contact', value: repaired })!
    expect(s.sections.contact?.preferred).toEqual(PICKED_CONTACT.spec)
    s = siteReducer(s, { type: 'pickSection', section: 'contact', value: { ...repaired } })!
    expect(s.sections.contact?.preferred).toBeUndefined()
  })

  it('clears the site on reset', () => {
    expect(siteReducer(start(), { type: 'reset' })).toBeNull()
  })

  it('ignores edits before a trade is picked', () => {
    expect(siteReducer(null, { type: 'setBusiness', patch: { name: 'X' } })).toBeNull()
  })
})
