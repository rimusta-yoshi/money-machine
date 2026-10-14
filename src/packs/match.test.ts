import { describe, expect, it } from 'vitest'
import { cleanRequestedType } from '../analytics/requested'
import { closestPack, stem } from './match'

describe('the closest business type', () => {
  it.each([
    ['sparky', 'electrician'],
    ['Boiler engineer', 'plumber'],
    ['gas engineer and heating', 'plumber'],
    ['painting & decorating', 'painter'],
    ['wallpaper hanger', 'painter'],
    ['Gardener', 'landscaper'],
    ['tree surgeon', 'landscaper'],
    ['flat roofs', 'roofer'],
    ['bathroom fitter', 'plumber'],
    ['EV charger installs', 'electrician'],
  ])('%s → %s', (typed, id) => {
    expect(closestPack(typed)?.id).toBe(id)
  })

  it('suggests nothing when nothing is close', () => {
    expect(closestPack('florist')).toBeNull()
    expect(closestPack('dog groomer')).toBeNull()
    expect(closestPack('my small business')).toBeNull()
  })

  it('treats plurals and -ing forms alike', () => {
    expect(stem('roofers')).toBe(stem('roofing'))
    expect(stem('plumber')).toBe(stem('plumbing'))
  })
})

describe('what we keep from "My business isn\'t listed"', () => {
  it('keeps a short business description, tidied', () => {
    expect(cleanRequestedType('  Dog   Groomer ')).toBe('dog groomer')
    expect(cleanRequestedType('Window cleaner’s round')).toBe('window cleaner\'s round')
    expect(cleanRequestedType('Hair & beauty')).toBe('hair & beauty')
  })

  it('drops anything personal or not a description', () => {
    expect(cleanRequestedType('call me on 07700 900123')).toBeNull()
    expect(cleanRequestedType('jo@example.com')).toBeNull()
    expect(cleanRequestedType('see www.mysite.co.uk')).toBeNull()
    expect(cleanRequestedType('https://example.org')).toBeNull()
    expect(cleanRequestedType('a')).toBeNull()
    expect(cleanRequestedType('one two three four five six seven')).toBeNull()
    expect(cleanRequestedType(42)).toBeNull()
  })
})
