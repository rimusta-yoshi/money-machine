import { describe, expect, it } from 'vitest'
import { movedTo, redirect } from './redirect'

const OLD = 'siteblocks.co.uk'
const NEW = 'localblocks.co.uk'
const at = (url: string) => movedTo(new URL(url), OLD, NEW)

describe('old domain redirects', () => {
  it('moves every address to the same place on the new domain, keeping path and query', () => {
    expect(at('https://siteblocks.co.uk/')).toBe('https://localblocks.co.uk/')
    expect(at('https://siteblocks.co.uk/build/?src=fb&utm_campaign=oct')).toBe('https://localblocks.co.uk/build/?src=fb&utm_campaign=oct')
    expect(at('https://joes-plumbing.siteblocks.co.uk/privacy')).toBe('https://joes-plumbing.localblocks.co.uk/privacy')
    expect(at('https://api.siteblocks.co.uk/v1/config')).toBe('https://api.localblocks.co.uk/v1/config')
    expect(at('https://preview.siteblocks.co.uk/abc/')).toBe('https://preview.localblocks.co.uk/abc/')
    expect(at('https://www.siteblocks.co.uk/admin/')).toBe('https://localblocks.co.uk/admin/')
    expect(at('https://JOES.SITEBLOCKS.CO.UK/')).toBe('https://joes.localblocks.co.uk/')
  })

  it('leaves alone anything not on the old domain', () => {
    expect(at('https://siteblocks.co.uk.evil.com/')).toBeNull()
    expect(at('https://notsiteblocks.co.uk/')).toBeNull()
    expect(at('https://a.b.siteblocks.co.uk/')).toBeNull()
  })

  it('is permanent: 301 for pages, 308 so posts keep their method and body', () => {
    const get = redirect(new Request('https://siteblocks.co.uk/build/#edit=x'), OLD, NEW)
    expect(get.status).toBe(301)
    expect(get.headers.get('Location')).toBe('https://localblocks.co.uk/build/')
    expect(redirect(new Request('https://api.siteblocks.co.uk/v1/stripe/webhook', { method: 'POST', body: '{}' }), OLD, NEW).status).toBe(308)
    expect(redirect(new Request('https://elsewhere.example/'), OLD, NEW).status).toBe(404)
  })
})
