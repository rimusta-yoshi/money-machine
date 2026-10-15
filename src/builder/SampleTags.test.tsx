// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { createSite } from '../site/defaults'
import { pageContent } from '../site/pageContent'
import { withSamplePhotos } from '../sample/content'
import { SampleTagged } from './SampleTags'
import { sampleSlots } from './sampleSlots'
import { tradeById } from '../trades'

const plumber = tradeById.plumber

afterEach(cleanup)

const p = (n: number) => ({ url: `https://example.com/s${n}.jpg`, alt: `Sample photo ${n}` })
const own = pageContent(createSite(plumber, 2), plumber)

describe('sample photo tags', () => {
  it('knows which photos on screen are samples, and for which slot', () => {
    const shown = withSamplePhotos(own, [p(1), p(2), p(3), p(4)])
    expect([...sampleSlots(own, shown)]).toEqual([[p(1).url, 'hero'], [p(2).url, 'about'], [p(3).url, 'gallery'], [p(4).url, 'gallery']])
    const withHero = { ...own, photos: { ...own.photos, hero: { url: 'https://example.com/mine.jpg', alt: 'Mine' } } }
    expect(sampleSlots(withHero, withSamplePhotos(withHero, [p(1), p(2)])).has('https://example.com/mine.jpg')).toBe(false)
  })

  it('tags each sample photo with a button in the section being edited, and a quiet label elsewhere', () => {
    const slots = new Map([[p(1).url, 'hero' as const]])
    const html = `<div class="sb-photo"><img src="${p(1).url}" alt=""></div><div class="sb-photo"><img src="https://example.com/mine.jpg" alt=""></div>`
    const { container, rerender } = render(<SampleTagged slots={slots} interactive><div dangerouslySetInnerHTML={{ __html: html }} /></SampleTagged>)
    const tags = container.querySelectorAll('.mm-sample-tag')
    expect(tags).toHaveLength(1)
    expect(tags[0].tagName).toBe('BUTTON')
    expect(tags[0].textContent).toBe('Sample · replace')
    expect(tags[0].getAttribute('aria-label')).toBe('Sample photo: replace with your own main photo')
    expect(tags[0].getAttribute('data-slot')).toBe('hero')
    rerender(<SampleTagged slots={slots} interactive={false}><div dangerouslySetInnerHTML={{ __html: html }} /></SampleTagged>)
    const quiet = container.querySelectorAll('.mm-sample-tag')
    expect(quiet).toHaveLength(1)
    expect(quiet[0].tagName).toBe('SPAN')
    expect(quiet[0].getAttribute('aria-hidden')).toBe('true')
  })
})
