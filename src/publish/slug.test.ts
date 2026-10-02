import { describe, expect, it } from 'vitest'
import { checkSlug, RESERVED_SLUGS, SLUG_MAX, slugCandidates, slugify } from './slug'

describe('slugify', () => {
  it('makes lowercase dashed words from a business name', () => {
    expect(slugify("Joe's Plumbing & Heating")).toBe('joes-plumbing-and-heating')
    expect(slugify('  Ánna  Łukasz Décor  ')).toBe('anna-ukasz-decor')
    expect(slugify('A1 -- Roofing!!')).toBe('a1-roofing')
  })

  it('cuts long names at a word boundary', () => {
    const slug = slugify('The Very Best Emergency Plumbing And Heating Engineers Of Greater Manchester')
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX)
    expect(slug.endsWith('-')).toBe(false)
    expect(slug).toBe('the-very-best-emergency-plumbing-and')
  })

  it('gives empty for names with no letters or numbers', () => {
    expect(slugify('!!!')).toBe('')
  })
})

describe('checkSlug', () => {
  it('accepts ordinary addresses', () => {
    for (const s of ['joes-plumbing', 'a1-roofing', 'abc', 'leeds-sparks-24']) expect(checkSlug(s)).toEqual({ ok: true, slug: s })
  })

  it('rejects bad shapes', () => {
    expect(checkSlug('ab')).toMatchObject({ ok: false, problem: 'short' })
    expect(checkSlug('a'.repeat(SLUG_MAX + 1))).toMatchObject({ ok: false, problem: 'long' })
    for (const s of ['Joes', '-joes', 'joes-', 'jo--es', 'xn--joes', 'joe_s', 'joe.s', 'joe s', 'jöe', '../x', '']) {
      expect(checkSlug(s).ok, s).toBe(false)
    }
  })

  it('blocks reserved words', () => {
    for (const s of ['www', 'api', 'admin', 'preview', 'mail']) {
      expect(RESERVED_SLUGS.has(s)).toBe(true)
      expect(checkSlug(s)).toMatchObject({ ok: false, problem: 'reserved' })
    }
  })

  it('blocks rude words without blocking real places', () => {
    expect(checkSlug('shit-plumbing')).toMatchObject({ ok: false, problem: 'blocked' })
    expect(checkSlug('fuckingroofers')).toMatchObject({ ok: false, problem: 'blocked' })
    for (const place of ['scunthorpe-plumbing', 'essex-roofing', 'cockermouth-sparks', 'penistone-painters', 'middlesex-gardens']) {
      expect(checkSlug(place).ok, place).toBe(true)
    }
  })
})

describe('slugCandidates', () => {
  it('offers the name first, then with the town and trade, then numbered', () => {
    const list = slugCandidates("Joe's Plumbing", { location: 'Leeds', trade: 'Plumber' })
    expect(list.slice(0, 3)).toEqual(['joes-plumbing', 'joes-plumbing-leeds', 'joes-plumbing-plumber'])
    expect(list).toContain('joes-plumbing-2')
    expect(list.every(s => checkSlug(s).ok)).toBe(true)
  })

  it('falls back to the trade and town when the name gives nothing usable', () => {
    expect(slugCandidates('', { location: 'Leeds', trade: 'Plumber' })[0]).toBe('plumber-leeds')
    expect(slugCandidates('API', { trade: 'Roofer' })).not.toContain('api')
  })
})
