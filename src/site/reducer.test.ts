import { describe, expect, it } from 'vitest'
import { plumber } from '../trades/plumber'
import { painter } from '../trades/painter'
import { siteReducer } from './reducer'
import type { Site } from './schema'
import { resolveSiteStyle } from '../gen'
import type { GeneratedHero } from '../gen'

const PICKED_HERO: GeneratedHero = {
  seed: 42,
  spec: { v: 1, section: 'hero', archetype: 'typeled', params: { trust: false, scale: 1.2, tone: 'ground' } },
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
    s = siteReducer(s, { type: 'select', section: 'contact', variantId: 'contact-simple' })!
    s = siteReducer(s, { type: 'pickGenerated', section: 'hero', value: PICKED_HERO })!
    s = siteReducer(s, { type: 'setContent', patch: { badges: ['Gas Safe'] } })!
    const switched = siteReducer(s, { type: 'pickTrade', trade: painter })!
    expect(switched.tradeId).toBe('painter')
    expect(switched.business.name).toBe('Joe')
    expect(switched.business.email).toBe('joe@example.com')
    expect(switched.selections).toEqual({})
    expect(switched.sections).toEqual({})
    expect(switched.content.badges).toBeNull()
    expect(switched.brandColor).toBe(painter.colorScheme.accent)
  })

  it('keeps everything when the same trade is picked again', () => {
    const s = siteReducer(start(), { type: 'pickGenerated', section: 'hero', value: PICKED_HERO })!
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
    const s = siteReducer(start(), { type: 'select', section: 'contact', variantId: 'contact-simple' })!
    expect(s.selections.contact).toBe('contact-simple')
  })

  it('never mutates the previous state', () => {
    const s = start()
    const frozen = JSON.stringify(s)
    siteReducer(s, { type: 'setBusiness', patch: { name: 'X' } })
    siteReducer(s, { type: 'toggleExtra', extra: 'reviews' })
    siteReducer(s, { type: 'select', section: 'contact', variantId: 'contact-simple' })
    siteReducer(s, { type: 'pickGenerated', section: 'hero', value: PICKED_HERO })
    siteReducer(s, { type: 'setTheme', theme: 'luxury' })
    siteReducer(s, { type: 'setContent', patch: { areas: ['Leeds'] } })
    siteReducer(s, { type: 'setBrandColor', color: '#000000' })
    expect(JSON.stringify(s)).toBe(frozen)
  })

  it('stores a generated hero as its batch seed plus the resolved spec', () => {
    const s = siteReducer(start(), { type: 'pickGenerated', section: 'hero', value: PICKED_HERO })!
    expect(s.sections.hero).toEqual(PICKED_HERO)
  })

  it('re-resolves the site style when the brand colour changes, keeping its seed', () => {
    const s = start()
    const next = siteReducer(s, { type: 'setBrandColor', color: '#0F766E' })!
    expect(next.style.seed).toBe(s.style.seed)
    expect(next.style.resolved).toEqual(resolveSiteStyle(s.style.theme, '#0F766E', s.style.seed))
  })

  it('re-resolves the site style when the theme changes', () => {
    const s = siteReducer(start(), { type: 'setTheme', theme: 'brutalism' })!
    expect(s.style.theme).toBe('brutalism')
    expect(s.style.resolved.theme).toBe('brutalism')
  })

  it('clears the site on reset', () => {
    expect(siteReducer(start(), { type: 'reset' })).toBeNull()
  })

  it('ignores edits before a trade is picked', () => {
    expect(siteReducer(null, { type: 'setBusiness', patch: { name: 'X' } })).toBeNull()
  })
})
