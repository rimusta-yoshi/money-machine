// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import axe from 'axe-core'
import { candidateSeed, generateSpec } from './core/pipeline'
import { GEN_CSS, resolveSiteStyle, SECTION_KEYS, SECTIONS, THEME_KEYS, viewOf } from '.'
import type { AnySpec, Band, SectionKey, ThemeKey } from '.'
import { RICH_PAGE } from './test/fixtures'

/**
 * Every archetype of every section, in every theme that uses it, rendered into desktop-
 * and phone-width frames on every band the rhythm can give it. jsdom has no layout
 * engine, so colour contrast is checked by the generator's static checks here and by axe
 * in a real browser (npm run a11y).
 */

/** One spec per archetype the theme uses, found by rolling seeds until each appears. */
function oneOfEach(type: SectionKey, theme: ThemeKey): AnySpec[] {
  const def = SECTIONS[type]
  const style = resolveSiteStyle(theme, '#E8743B', 2)
  const want = Object.entries(def.weights[theme] ?? {}).filter(([, w]) => w > 0).length
  const found = new Map<string, AnySpec>()
  for (let i = 0; i < 600 && found.size < want; i++) {
    const spec = generateSpec(def, candidateSeed(11, i), viewOf(type, RICH_PAGE) as never, style)
    if (!found.has(spec.archetype)) found.set(spec.archetype, spec)
  }
  return [...found.values()]
}

const bandsFor = (type: SectionKey, spec: AnySpec): Band[] => {
  const fixed = SECTIONS[type].fixedBand?.(spec as never)
  return fixed ? [fixed] : ['ground', 'surface', 'brand', 'ink']
}

const cases = THEME_KEYS.flatMap(theme => SECTION_KEYS.flatMap(type => oneOfEach(type, theme).map(spec => ({ type, spec, theme, archetype: spec.archetype }))))

afterEach(() => { document.body.innerHTML = ''; document.head.innerHTML = '' })

function mount(html: string, width: number, hero: boolean): HTMLElement {
  const style = document.createElement('style')
  style.textContent = GEN_CSS
  document.head.appendChild(style)
  document.documentElement.lang = 'en'
  const main = document.createElement('main')
  main.style.width = `${width}px`
  // A page-level h1 so each section's h2 sits in a real heading outline (the hero brings its own).
  main.innerHTML = `${hero ? '' : '<h1>Page</h1>'}${html}`
  document.body.appendChild(main)
  return main
}

describe.each(cases)('$theme · $type · $archetype', ({ type, spec, theme }) => {
  const style = resolveSiteStyle(theme, '#E8743B', 2)
  const def = SECTIONS[type]
  const html = (band: Band) => def.render(spec, style, viewOf(type, RICH_PAGE), { band, side: 'left', motif: true })

  it('has no axe violations on any band, at desktop and phone width', async () => {
    for (const band of bandsFor(type, spec)) {
      for (const width of [1200, 375]) {
        const root = mount(html(band), width, type === 'hero')
        const result = await axe.run(root, { rules: { 'color-contrast': { enabled: false } } })
        expect(result.violations.map(v => `${band}/${width} ${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
        document.body.innerHTML = ''
      }
    }
  })

  it('names the section by its own heading and hides decorative icons', () => {
    const root = mount(html('ground'), 1200, type === 'hero')
    const section = root.querySelector('section')
    if (section) {
      const heading = document.getElementById(section.getAttribute('aria-labelledby')!)
      expect(heading?.tagName).toBe(type === 'hero' ? 'H1' : 'H2')
      expect(heading?.textContent?.trim()).toBeTruthy()
    } else {
      expect(root.querySelector('footer')).not.toBeNull()
    }
    if (type === 'hero') expect(root.querySelectorAll('h1')).toHaveLength(1)
    root.querySelectorAll('svg').forEach(svg => expect(svg.getAttribute('aria-hidden')).toBe('true'))
  })

  it('gives every image alt text, every field a label and every link somewhere to go', () => {
    const root = mount(html('ground'), 1200, type === 'hero')
    root.querySelectorAll('img').forEach(img => expect(img.getAttribute('alt')).toBeTruthy())
    root.querySelectorAll('input, textarea').forEach(f => expect(root.querySelector(`label[for="${f.id}"]`)).not.toBeNull())
    root.querySelectorAll('a').forEach(a => expect(a.getAttribute('href')).toMatch(/^(tel:|mailto:|#|https:)/))
  })

  it('announces star ratings as words and marks any overlapping decoration for the covers-text check', () => {
    const root = mount(html('ground'), 1200, type === 'hero')
    root.querySelectorAll('.sb-stars').forEach(s => expect(s.getAttribute('aria-label')).toMatch(/^Rated [\d.]+ out of 5$/))
    root.querySelectorAll('.sb-sticker, .sb-float, .sb-stripe, .sb-rbadge').forEach(d => expect(d.hasAttribute('data-over')).toBe(true))
  })
})

describe('shared stylesheet', () => {
  it('draws a visible focus ring and respects reduced motion', () => {
    expect(GEN_CSS).toMatch(/\.sb-sec :focus-visible\{outline:3px solid/)
    expect(GEN_CSS).toMatch(/@media \(prefers-reduced-motion: reduce\)\{\s*\.sb-sec \*/)
  })

  it('gives each band its colours with enough specificity to beat the section defaults', () => {
    for (const band of ['surface', 'brand', 'ink', 'photo']) expect(GEN_CSS).toContain(`.sb-sec.sb-tone--${band}{`)
  })

  it('only animates when motion is welcome', () => {
    const transitions = GEN_CSS.match(/[^{}]*\{[^{}]*transition:[^{}]*\}/g) ?? []
    for (const rule of transitions.filter(r => !/transition:none/.test(r))) {
      const at = GEN_CSS.indexOf(rule)
      expect(GEN_CSS.lastIndexOf('prefers-reduced-motion: no-preference', at), rule).toBeGreaterThan(-1)
    }
  })
})
