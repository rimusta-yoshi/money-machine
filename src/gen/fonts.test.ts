/// <reference types="node" />
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fontFaceCss, fontFileName, GEN_CSS, renderPage, resolvePage, resolveSiteStyle, SECTION_KEYS, SITE_FONT_FILES, siteFontFaces, THEME_KEYS, THEMES } from '.'
import { RICH_PAGE } from './test/fixtures'

const root = join(__dirname, '..', '..')
const fontsDir = join(root, 'public', 'fonts')
const builderCss = readFileSync(join(fontsDir, 'fonts.css'), 'utf8')

describe('self-hosted fonts', () => {
  it('has a file for every face a theme can ask for', () => {
    for (const theme of Object.values(THEMES)) for (const face of Object.values(theme.fonts)) {
      expect(SITE_FONT_FILES[face.family], face.family).toContain(String(face.weight))
    }
  })

  it('ships every registered file, and the builder stylesheet declares it', () => {
    for (const [family, faces] of Object.entries(SITE_FONT_FILES)) for (const face of faces) {
      const [weight, italic] = face.split('-')
      const file = fontFileName({ family, weight: Number(weight), italic: !!italic })
      expect(existsSync(join(fontsDir, file)), file).toBe(true)
      expect(builderCss).toContain(`font-family:'${family}';font-style:${italic ? 'italic' : 'normal'};font-weight:${weight};`)
    }
  })

  it('ships the licence alongside the files', () => {
    expect(readFileSync(join(fontsDir, 'LICENSES.txt'), 'utf8')).toContain('Open Font License')
  })

  it('gives a site only the faces its style uses, from its own server', () => {
    for (const theme of THEME_KEYS) for (let seed = 0; seed < 6; seed++) {
      const style = resolveSiteStyle(theme, '#1E88E5', seed)
      const css = fontFaceCss(style, 'https://site.example/fonts/')
      const families = new Set(siteFontFaces(style).map(f => f.family))
      expect([...families].sort()).toEqual([...new Set(Object.values(style.fonts).map(f => f.family))].sort())
      expect(css).not.toMatch(/fonts\.(googleapis|gstatic)\.com/)
      for (const url of css.match(/url\('([^']+)'\)/g) ?? []) expect(url).toMatch(/^url\('https:\/\/site\.example\/fonts\/[a-z0-9-]+\.woff2'\)$/)
    }
  })
})

describe('no third-party font requests', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap(d => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]))

  it('the builder page, app source and public files never reference Google Fonts', () => {
    const files = [join(root, 'index.html'), ...walk(join(root, 'src')), ...walk(fontsDir).filter(f => f.endsWith('.css'))]
      .filter(f => !f.endsWith('fonts.test.ts'))
    for (const f of files.filter(f => /\.(html|css|tsx?)$/.test(f))) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/fonts\.(googleapis|gstatic)\.com/)
    }
  })

  it('generated pages and their stylesheet never reference an external font host', () => {
    for (const theme of THEME_KEYS) {
      const style = resolveSiteStyle(theme, '#8C6D3F', 2)
      const page = resolvePage({ order: SECTION_KEYS, saved: {}, content: RICH_PAGE, style, styleSeed: 2 })
      expect(renderPage(page, style, RICH_PAGE)).not.toMatch(/fonts\.(googleapis|gstatic)/)
    }
    expect(GEN_CSS).not.toMatch(/@import|fonts\.(googleapis|gstatic)/)
  })
})

describe('old hand-made sections', () => {
  it('are gone: no template components or their stylesheet remain', () => {
    const dir = join(root, 'src', 'components', 'sections')
    expect(existsSync(join(dir, 'sections.css'))).toBe(false)
    expect(readdirSync(dir).sort()).toEqual(['GeneratedSection.tsx'])
  })
})
