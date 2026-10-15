// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createSite } from '../site/defaults'
import { parseSite } from '../site/parse'
import { siteReducer } from '../site/reducer'
import type { Site } from '../site/schema'
import { BasicsStep } from './basics/BasicsStep'
import { GalleryEditor } from './content/PhotoEditor'
import { noticeText, TEXT_NOTE, textTooLong } from './useFitRepair'
import { tradeById } from '../trades'

const plumber = tradeById.plumber
const painter = tradeById.painter

afterEach(cleanup)

describe('when a chosen layout stops fitting the customer’s text', () => {
  it('says so in one short line, and how to get it back', () => {
    expect(noticeText([{ type: 'hero', status: 'repaired', text: true }])).toBe('Your text is a bit long for this layout, so we’re showing the closest match. Shorten it to get yours back.')
    expect(noticeText([{ type: 'hero', status: 'fallback', text: true }])).toBe(TEXT_NOTE)
    expect(noticeText([{ type: 'hero', status: 'repaired', text: true }, { type: 'about', status: 'repaired', text: true }])).toMatch(/^Your text is a bit long for some layouts/)
    expect(noticeText([{ type: 'gallery', status: 'restored' }, { type: 'hero', status: 'repaired', text: true }])).toBe(`The gallery layout you chose fits again, so it’s back. ${TEXT_NOTE}`)
  })

  it('keeps the general message when something else caused the swap (a new look, a removed photo)', () => {
    expect(noticeText([{ type: 'hero', status: 'repaired', text: false }])).toMatch(/^Your details changed/)
  })

  it('counts only text-fit checks as text being too long', () => {
    expect(textTooLong([{ id: 'headline-fits' }])).toBe(true)
    expect(textTooLong([{ id: 'heading-fits' }, { id: 'theme-fit' }])).toBe(true)
    expect(textTooLong([{ id: 'theme-fit' }])).toBe(false)
    expect(textTooLong([{ id: 'content-gate' }])).toBe(false)
  })
})

describe('a short gallery', () => {
  const photo = (n: number) => ({ url: `data:image/webp;base64,AAA${n}`, alt: `Job ${n}` })
  const nudge = /three or more photos open up more gallery layouts/

  it('nudges gently for more photos below three, and not otherwise', () => {
    for (const [n, shown] of [[0, false], [1, true], [2, true], [3, false], [7, false]] as const) {
      render(<GalleryEditor photos={Array.from({ length: n }, (_, i) => photo(i))} max={12} defaultAlt={i => `Job ${i}`} onChange={vi.fn()} />)
      expect(!!screen.queryByText(nudge), `${n} photos`).toBe(shown)
      cleanup()
    }
  })
})

describe('the sample photo set', () => {
  it('is fixed when the site is created: a new name, colour, style or trade keeps it', () => {
    let s = createSite(plumber, 9)
    const seed = s.sampleSeed
    expect(seed).toEqual(expect.any(Number))
    expect(createSite(plumber, 10).sampleSeed).not.toBe(seed)
    s = siteReducer(s, { type: 'setBusiness', patch: { name: 'Joe Pipes' } })!
    s = siteReducer(s, { type: 'setBrandColor', color: '#0F766E' })!
    s = siteReducer(s, { type: 'rerollStyle', seed: 77 })!
    s = siteReducer(s, { type: 'setTheme', theme: 'workwear' })!
    s = siteReducer(s, { type: 'pickTrade', trade: painter })!
    expect(s.sampleSeed).toBe(seed)
    expect(parseSite(JSON.parse(JSON.stringify(s))).sampleSeed).toBe(seed)
  })

  it('is set once for records saved before it existed, then stays put', () => {
    const { sampleSeed: _drop, ...old } = { ...createSite(plumber, 3), business: { ...createSite(plumber, 3).business, name: 'Joe Pipes' } }
    void _drop
    const opened = parseSite(old)
    expect(opened.sampleSeed).toEqual(expect.any(Number))
    expect(parseSite(old).sampleSeed).toBe(opened.sampleSeed)
    const renamed = siteReducer(opened, { type: 'setBusiness', patch: { name: 'Pipes & Sons' } })!
    expect(parseSite(JSON.parse(JSON.stringify(renamed))).sampleSeed).toBe(opened.sampleSeed)
  })
})

describe('a phone number with no digits', () => {
  const site = (phone: string): Site => ({ ...createSite(plumber, 3), business: { ...createSite(plumber, 3).business, name: 'Joe Pipes', phone } })
  const warning = 'Without a number, your site won’t have a call button.'

  it('warns, but still lets the customer carry on', () => {
    const onNext = vi.fn()
    render(<BasicsStep trade={plumber} site={site('TBC')} onPickTrade={vi.fn()} onBusinessChange={vi.fn()} onNext={onNext} />)
    const field = screen.getByLabelText('Phone number')
    expect(screen.getByText(warning)).toBeTruthy()
    expect(field.getAttribute('aria-describedby')).toContain(screen.getByText(warning).id)
    expect(field.getAttribute('aria-invalid')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Next: your look' }))
    expect(onNext).toHaveBeenCalled()
  })

  it('says nothing of the sort for a real number', () => {
    render(<BasicsStep trade={plumber} site={site('0113 496 0000')} onPickTrade={vi.fn()} onBusinessChange={vi.fn()} onNext={vi.fn()} />)
    expect(screen.queryByText(warning)).toBeNull()
  })
})
