import { describe, expect, it } from 'vitest'
import { plumber } from '../trades/plumber'
import { painter } from '../trades/painter'
import { siteReducer } from './reducer'
import type { Site } from './schema'

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
    s = siteReducer(s, { type: 'select', section: 'hero', variantId: 'hero-split' })!
    s = siteReducer(s, { type: 'setContent', patch: { badges: ['Gas Safe'] } })!
    const switched = siteReducer(s, { type: 'pickTrade', trade: painter })!
    expect(switched.tradeId).toBe('painter')
    expect(switched.business.name).toBe('Joe')
    expect(switched.business.email).toBe('joe@example.com')
    expect(switched.selections).toEqual({})
    expect(switched.content.badges).toBeNull()
    expect(switched.brandColor).toBe(painter.colorScheme.accent)
  })

  it('keeps everything when the same trade is picked again', () => {
    const s = siteReducer(start(), { type: 'select', section: 'hero', variantId: 'hero-split' })!
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
    siteReducer(s, { type: 'select', section: 'hero', variantId: 'hero-split' })
    siteReducer(s, { type: 'setContent', patch: { areas: ['Leeds'] } })
    siteReducer(s, { type: 'setBrandColor', color: '#000000' })
    expect(JSON.stringify(s)).toBe(frozen)
  })

  it('clears the site on reset', () => {
    expect(siteReducer(start(), { type: 'reset' })).toBeNull()
  })

  it('ignores edits before a trade is picked', () => {
    expect(siteReducer(null, { type: 'setBusiness', patch: { name: 'X' } })).toBeNull()
  })
})
