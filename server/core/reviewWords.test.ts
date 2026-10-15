import { describe, expect, it } from 'vitest'
import { finishedSite } from '../../src/publish/test/sites'
import type { Site } from '../../src/site/schema'
import { REVIEW_WORDS, reviewText, reviewWords } from './reviewWords'

const base = finishedSite()
const withAbout = (about: string): Site => ({ ...base, business: { ...base.business, about } })
const words = (about: string): string[] => reviewWords(withAbout(about))

describe('reviewWords', () => {
  it('finds nothing in an ordinary trade site', () => {
    expect(reviewWords(base)).toEqual([])
  })

  it('matches whole words in any case', () => {
    expect(words('Bank transfers welcome')).toEqual(['bank'])
    expect(words('ONLINE BANKING help')).toEqual(['banking'])
    expect(words('Please LOGIN here')).toEqual(['login'])
    expect(words('Enter your password.')).toEqual(['password'])
    expect(words('bank, then (bank)')).toEqual(['bank'])
  })

  it('ignores words inside other words', () => {
    for (const about of ['Repairs on the embankment', 'Murals inspired by Banksy', 'Riverbank fencing', 'Passwordless entry systems',
      'Wallets of leather? No: wallpapering', 'Logins aside, we plaster', 'Cryptography fans welcome', 'We sign invoices']) {
      expect(words(about), about).toEqual([])
    }
  })

  it('matches phrases across any spacing, but never across two fields', () => {
    expect(words('Please log   in to verify your  account')).toEqual(['log in', 'verify your account'])
    expect(words('Sign in to see your quote')).toEqual(['sign in'])
    expect(words('Never share your seed phrase or PIN number')).toEqual(['seed phrase', 'pin number'])
    const split: Site = { ...base, business: { ...base.business, about: 'We fit logs, then log' }, content: { ...base.content, certsNote: 'In stock now' } }
    expect(reviewWords(split)).toEqual([])
  })

  it('lets "Bank holidays" in opening hours through, but not a bank', () => {
    const hours = (day: string): Site => ({ ...base, content: { ...base.content, hours: [{ day, time: 'Closed' }] } })
    expect(reviewWords(hours('Bank holidays'))).toEqual([])
    expect(reviewWords(hours('Bank Holiday Monday'))).toEqual([])
    expect(reviewWords(hours('Bank holidays and bank visits'))).toEqual(['bank'])
  })

  it('returns each list entry once, in the list order', () => {
    expect(words('Wallet, crypto, bitcoin, wallet, CRYPTO. Account suspended! Passcode?')).toEqual(['passcode', 'crypto', 'bitcoin', 'wallet', 'account suspended'])
    expect(REVIEW_WORDS).toContain('bank')
  })

  it('looks at every customer-visible field', () => {
    const photo = { url: 'https://preview.x/photos/a/b.jpg', alt: 'Our bank branch' }
    const cases: Site[] = [
      { ...base, business: { ...base.business, name: 'Bank Plumbing' } },
      { ...base, business: { ...base.business, location: 'Bank' } },
      { ...base, content: { ...base.content, services: ['Bank repairs'] } },
      { ...base, content: { ...base.content, badges: ['Bank approved'] } },
      { ...base, content: { ...base.content, whyUs: [{ title: 'Fast', text: 'Bank on us' }] } },
      { ...base, content: { ...base.content, whyUs: [{ title: 'Bank on us', text: '' }] } },
      { ...base, content: { ...base.content, certsNote: 'Bank details on request' } },
      { ...base, content: { ...base.content, areas: ['Bank'] } },
      { ...base, content: { ...base.content, hours: [{ day: 'Mon', time: 'Bank time' }] } },
      { ...base, content: { ...base.content, jobsDone: 'bank' } },
      { ...base, content: { ...base.content, reviews: [{ author: 'Jo', location: '', text: 'Saved my bank', rating: 5 }] } },
      { ...base, content: { ...base.content, reviews: [{ author: 'Bank Manager', location: '', text: 'Great', rating: 5 }] } },
      { ...base, content: { ...base.content, photos: { ...base.content.photos, hero: photo } } },
      { ...base, content: { ...base.content, photos: { ...base.content.photos, about: photo } } },
      { ...base, content: { ...base.content, photos: { ...base.content.photos, gallery: [photo] } } },
      { ...base, content: { ...base.content, headline: 'Your bank, fixed' } as Site['content'] },
    ]
    cases.forEach((site, i) => expect(reviewWords(site), `case ${i}`).toEqual(['bank']))
  })

  it('copes with a missing or empty headline and no optional lists', () => {
    const bare: Site = { ...base, content: { ...base.content, headline: null, reviews: null, areas: null, badges: null, hours: null, whyUs: undefined, services: undefined } as Site['content'] }
    expect(reviewWords(bare)).toEqual([])
    expect(reviewText(bare)).toContain(base.business.name)
  })
})
