import { describe, expect, it } from 'vitest'
import { tradeById } from '../trades'
import { siteFiles } from './files'
import { fontFiles, photoFiles, portableCss, portableHtml, readmeTxt } from './portable'
import { finishedSite } from './test/sites'
import { crc32, unzipStored, zipFiles } from './zip'

const bytes = (s: string) => new TextEncoder().encode(s)

describe('zip', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(bytes('123456789'))).toBe(0xCBF43926)
    expect(crc32(new Uint8Array())).toBe(0)
  })

  it('round-trips files and folders', () => {
    const files = [{ path: 'index.html', data: bytes('<p>Hi</p>') }, { path: 'photos/a.webp', data: new Uint8Array([0, 1, 2, 255]) }, { path: 'fonts/LICENSES.txt', data: bytes('ok') }]
    const out = unzipStored(zipFiles(files, new Date(2026, 9, 13, 12, 30)))
    expect([...out.keys()]).toEqual(['index.html', 'photos/a.webp', 'fonts/LICENSES.txt'])
    expect([...out.get('photos/a.webp')!]).toEqual([0, 1, 2, 255])
  })

  it('refuses paths that could land outside the folder', () => {
    for (const path of ['/etc/x', '../x', 'a/../../x', 'a\\b', '']) expect(() => zipFiles([{ path, data: bytes('x') }]), path).toThrow()
  })
})

describe('portable site files', () => {
  it('turns a published site into one that works from a folder', async () => {
    const site = finishedSite({ content: { photos: { hero: { url: '/photos/0a1b2c.webp', alt: 'A boiler' }, about: null, gallery: [] } } })
    const files = await siteFiles(site, tradeById.plumber, { origin: 'https://joes.localblocks.co.uk', noindex: true, date: new Date('2026-10-02') })
    const page = (n: string) => files.find(f => f.name === n)!.body
    const index = portableHtml(page('index.html'))
    const privacy = portableHtml(page('privacy.html'))
    const css = portableCss(files[2].body)
    expect(index).toContain(`href="${files[2].name}"`)
    expect(index).toContain('src="photos/0a1b2c.webp"')
    expect(index).toContain('href="privacy.html"')
    expect(index).toContain('href="favicon.svg"')
    expect(privacy).toContain('href="index.html"')
    for (const html of [index, privacy]) {
      expect(html).not.toMatch(/(?:href|src)="\/(?!\/)/)
      expect(html).not.toMatch(/name="robots"|rel="canonical"|og:url|og:image/)
    }
    expect(css).not.toContain("url('/fonts/")
    expect(fontFiles(files[2].body).length).toBeGreaterThan(0)
    expect(css).toContain(`url('fonts/${fontFiles(files[2].body)[0]}')`)
    expect(photoFiles(page('index.html'), page('privacy.html'))).toEqual(['photos/0a1b2c.webp'])
  })

  it('leaves the customer’s own words alone', () => {
    const html = '<p>Call &#34;/photos/x.webp&#34; and visit /privacy</p><a href="https://example.com/photos/x.webp">x</a>'
    expect(portableHtml(html)).toBe(html)
  })

  it('writes a README that says how to open and host it', () => {
    const t = readmeTxt({ brand: 'Local Blocks', siteUrl: 'https://joes.localblocks.co.uk/', guideUrl: 'https://localblocks.co.uk/guide/host-your-own-site/', date: '2026-10-13' })
    expect(t).toContain('double-click index.html')
    expect(t).toContain('https://localblocks.co.uk/guide/host-your-own-site/')
    expect(t).toContain('https://joes.localblocks.co.uk,')
  })
})
