// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { THEME_KEYS } from '../gen'
import { parseSite } from '../site/parse'
import type { Site } from '../site/schema'
import { tradeById } from '../trades'
import { homeDocument, privacyDocument, siteFavicon } from './document'
import { finishedSite } from './test/sites'

/** Hostile text, each within its field's limit, so validation lets it through to the renderer. */
const NASTY = {
  script: '<script>alert(1)</script>',
  img: '"><img src=x onerror=alert(1)>',
  svg: '"><svg onload=alert(1)>',
  attr: "' onmouseover='alert(1)",
  js: 'javascript:alert(1)',
  style: '</style><script>x</script>',
  comment: '<!-- --><b>x</b>',
  entity: '&lt;script&gt;&amp;',
}

function nastySite(theme: typeof THEME_KEYS[number]): Site {
  return finishedSite({
    theme,
    extras: ['reviews'],
    business: { name: NASTY.script, location: NASTY.img, about: `${NASTY.style} ${NASTY.attr} ${NASTY.entity}`, yearsInBusiness: '<b>', phone: `0113 ${NASTY.js}`.slice(0, 30) },
    content: {
      badges: [NASTY.svg, NASTY.attr, NASTY.comment],
      areas: [NASTY.svg, NASTY.js],
      hours: [{ day: '<i>Mon</i>', time: NASTY.svg }],
      emergency: true,
      jobsDone: '<i>x</i>',
      rating: { score: 4.8, count: 20 },
      reviews: [{ author: NASTY.script, location: NASTY.img, text: `${NASTY.style}${NASTY.svg}`, rating: 5 }],
      whyUs: [{ title: NASTY.script, text: NASTY.img }],
      services: [NASTY.svg, NASTY.attr],
      certsNote: NASTY.comment,
      photos: {
        hero: { url: '/photos/abc.webp', alt: NASTY.img },
        about: { url: '/photos/def.webp', alt: NASTY.attr },
        gallery: [{ url: '/photos/ghi.webp', alt: NASTY.script }],
      },
    },
  })
}

const SAFE_URL = /^(https:\/\/|tel:\+?\d+$|mailto:|#|\/(?!\/))/i

function assertInert(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  expect(doc.querySelectorAll('script, iframe, object, embed, svg[onload], base, meta[http-equiv]')).toHaveLength(0)
  expect(doc.querySelectorAll('body style')).toHaveLength(0)
  for (const el of doc.querySelectorAll('*')) {
    for (const a of el.attributes) {
      expect(a.name.startsWith('on'), `${el.tagName} ${a.name}`).toBe(false)
      if (a.name === 'href' || a.name === 'src') expect(a.value, `${el.tagName} ${a.name}`).toMatch(SAFE_URL)
    }
  }
  return doc
}

describe('customer text can never become markup', () => {
  for (const theme of THEME_KEYS) {
    it(`renders hostile input as plain text (${theme})`, () => {
      const site = nastySite(theme)
      // It is a valid record: validation is not what keeps it safe, the renderer is.
      expect(() => parseSite(JSON.parse(JSON.stringify({ ...site, content: { ...site.content, photos: { hero: null, about: null, gallery: [] } } })))).not.toThrow()
      const opts = { origin: 'https://x.siteblocks.co.uk', base: '', cssHref: '/s.css', noindex: true, date: new Date('2026-10-02') }
      const home = assertInert(homeDocument(site, tradeById.plumber, opts))
      const text = home.body.textContent ?? ''
      expect(text).toContain(NASTY.script)
      expect(home.title).toContain(NASTY.script)
      expect(home.querySelector('meta[name=description]')?.getAttribute('content')).toContain(NASTY.style)
      expect(text).toContain(NASTY.entity)
      assertInert(privacyDocument(site, tradeById.plumber, opts))
      assertInert(homeDocument(site, tradeById.plumber, { ...opts, preview: true, base: '/tok' }))
    })
  }

  it('escapes the favicon letter and colours', () => {
    const svg = siteFavicon(nastySite('workwear'), tradeById.plumber)
    expect(svg).not.toContain('<script')
  })
})

describe('validation rejects dangerous values outright', () => {
  const base = () => JSON.parse(JSON.stringify(finishedSite())) as Site
  const withPhoto = (url: string) => {
    const s = base()
    return { ...s, content: { ...s.content, photos: { ...s.content.photos, hero: { url, alt: 'x' } } } }
  }

  it.each([
    'javascript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'http://example.com/a.jpg',
    'https://example.com/a.jpg" onerror="alert(1)',
    "https://example.com/a.jpg'><script>",
    'https://example.com/a b.jpg',
    '/photos/../../etc/passwd',
  ])('photo URL %s', url => {
    expect(() => parseSite(withPhoto(url))).toThrow()
  })

  it('rejects a brand colour that is not a hex colour', () => {
    expect(() => parseSite({ ...base(), brandColor: 'red;background:url(x)' })).toThrow()
  })

  it('rejects an email that is not an email', () => {
    const s = base()
    expect(() => parseSite({ ...s, business: { ...s.business, email: '"<script>"@x.co' } })).toThrow()
  })

  it('rejects unknown fields in stored layouts', () => {
    const s = base()
    const hero = s.sections.hero!
    expect(() => parseSite({ ...s, sections: { ...s.sections, hero: { ...hero, spec: { ...hero.spec, params: { ...hero.spec.params, html: '<script>' } } } } })).toThrow()
  })
})
