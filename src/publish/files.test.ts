import { describe, expect, it } from 'vitest'
import { tradeById } from '../trades'
import { siteFiles } from './files'
import { filePath } from './paths'
import { finishedSite } from './test/sites'

describe('siteFiles', () => {
  it('writes the pages, a content-named stylesheet, icon, sitemap and robots rules', async () => {
    const files = await siteFiles(finishedSite(), tradeById.plumber, { origin: 'https://joes.siteblocks.co.uk', noindex: true, date: new Date('2026-10-02') })
    const names = files.map(f => f.name)
    expect(names).toEqual(['index.html', 'privacy.html', expect.stringMatching(/^site-[0-9a-f]{12}\.css$/), 'favicon.svg', 'sitemap.xml', 'robots.txt'])
    const css = files[2]
    expect(css.immutable).toBe(true)
    expect(files[0].body).toContain(`href="/${css.name}"`)
    expect(files.find(f => f.name === 'robots.txt')!.body).toContain('Disallow: /')
    expect(files.find(f => f.name === 'sitemap.xml')!.body).toContain('<lastmod>2026-10-02</lastmod>')
  })

  it('names the stylesheet by its content', async () => {
    const opts = { origin: 'https://a.siteblocks.co.uk', noindex: true, date: new Date('2026-10-02') }
    const a = await siteFiles(finishedSite({ theme: 'workwear' }), tradeById.plumber, opts)
    const b = await siteFiles(finishedSite({ theme: 'clean-pro' }), tradeById.plumber, opts)
    expect(a[2].name).not.toBe(b[2].name)
  })
})

describe('filePath', () => {
  it('maps the paths a site serves', () => {
    expect(filePath('/')).toBe('index.html')
    expect(filePath('/privacy')).toBe('privacy.html')
    expect(filePath('/privacy/')).toBe('privacy.html')
    expect(filePath('/site-abc123.css')).toBe('site-abc123.css')
    expect(filePath('/photos/0a1b2c.webp')).toBe('photos/0a1b2c.webp')
    expect(filePath('/robots.txt')).toBe('robots.txt')
  })

  it('refuses anything else', () => {
    for (const p of ['/../x.css', '/photos/../index.html', '/%2e%2e/x.css', '/a/b/c.css', '/x.js', '/.env', '/Index.html', '/photos/x.webp/', '//evil.com/x.css', '/x.css?y']) {
      expect(filePath(p), p).toBeNull()
    }
  })
})
