// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import axe from 'axe-core'
import { candidateSeed, generateSpec } from './core/pipeline'
import { BANDS, GEN_CSS, resolveSiteStyle, SECTION_KEYS, SECTIONS, THEME_KEYS, viewOf } from '.'
import type { AnySpec, Band, SectionKey } from '.'
import { RICH_PAGE } from './test/fixtures'

/**
 * Every archetype of every section, on every theme, rendered into desktop- and phone-width
 * frames, on every band the rhythm can give it. jsdom has no layout engine, so colour
 * contrast is checked by the generator's static checks here and by axe in a real browser.
 */
const style0 = resolveSiteStyle('professional', '#1E88E5', 1)

/** One spec per archetype, found by rolling seeds until each appears. */
function oneOfEach(type: SectionKey): AnySpec[] {
  const def = SECTIONS[type]
  const found = new Map<string, AnySpec>()
  for (let i = 0; i < 400 && found.size < Object.keys(def.archetypes).length; i++) {
    const spec = generateSpec(def, candidateSeed(11, i), viewOf(type, RICH_PAGE) as never, style0)
    if (!found.has(spec.archetype)) found.set(spec.archetype, spec)
  }
  return [...found.values()]
}

const bandsFor = (type: SectionKey): Band[] =>
  type === 'footer' ? ['ink'] : type === 'hero' ? ['ground'] : BANDS.filter(b => b !== 'ink' && b !== 'photo')

const cases = SECTION_KEYS.filter(t => t !== 'hero').flatMap(type =>
  oneOfEach(type).flatMap(spec => THEME_KEYS.map(theme => ({ type, spec, theme, archetype: spec.archetype }))))

afterEach(() => { document.body.innerHTML = ''; document.head.innerHTML = '' })

function mount(html: string, width: number): HTMLElement {
  const style = document.createElement('style')
  style.textContent = GEN_CSS
  document.head.appendChild(style)
  document.documentElement.lang = 'en'
  const main = document.createElement('main')
  main.style.width = `${width}px`
  // A page-level h1 so each section's h2 sits in a real heading outline.
  main.innerHTML = `<h1>Page</h1>${html}`
  document.body.appendChild(main)
  return main
}

describe.each(cases)('$type · $archetype · $theme', ({ type, spec, theme }) => {
  const style = resolveSiteStyle(theme, '#E8743B', 2)
  const def = SECTIONS[type]
  const html = (band: Band) => def.render(spec, style, viewOf(type, RICH_PAGE), { band, side: 'left' })

  it('has no axe violations on any band, at desktop and phone width', async () => {
    for (const band of bandsFor(type)) {
      for (const width of [1200, 375]) {
        const root = mount(html(band), width)
        const result = await axe.run(root, { rules: { 'color-contrast': { enabled: false } } })
        expect(result.violations.map(v => `${band}/${width} ${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
        document.body.innerHTML = ''
      }
    }
  })

  it('names the section by its own heading and hides decorative icons', () => {
    const root = mount(html('ground'), 1200)
    const section = root.querySelector('section')
    if (section) {
      const heading = document.getElementById(section.getAttribute('aria-labelledby')!)
      expect(heading?.tagName).toBe('H2')
      expect(heading?.textContent?.trim()).toBeTruthy()
    } else {
      expect(root.querySelector('footer')).not.toBeNull()
    }
    root.querySelectorAll('svg').forEach(svg => expect(svg.getAttribute('aria-hidden')).toBe('true'))
  })

  it('gives every image alt text, every field a label and every link somewhere to go', () => {
    const root = mount(html('ground'), 1200)
    root.querySelectorAll('img').forEach(img => expect(img.getAttribute('alt')).toBeTruthy())
    root.querySelectorAll('input, textarea').forEach(f => expect(root.querySelector(`label[for="${f.id}"]`)).not.toBeNull())
    root.querySelectorAll('a').forEach(a => expect(a.getAttribute('href')).toMatch(/^(tel:|mailto:|#|https:)/))
  })
})

describe('shared stylesheet', () => {
  it('draws a visible focus ring and respects reduced motion', () => {
    expect(GEN_CSS).toMatch(/\.sb-sec :focus-visible\{outline:3px solid/)
    expect(GEN_CSS).toMatch(/@media \(prefers-reduced-motion: reduce\)\{\s*\.sb-sec \*/)
  })

  it('gives each band its colours with enough specificity to beat the section defaults', () => {
    for (const band of ['surface', 'brand', 'ink']) expect(GEN_CSS).toContain(`.sb-sec.sb-tone--${band}{`)
  })
})
