// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import axe from 'axe-core'
import { GEN_CSS, renderSection, resolveSiteStyle, THEME_KEYS } from '.'
import { ONE_OF_EACH, RICH } from './test/fixtures'

/**
 * Renders each archetype into a desktop-width and a phone-width frame and runs axe.
 * jsdom has no layout engine: colour contrast is covered by the static checks (and the
 * generator rejects failures), and container queries don't apply here, so both frames
 * share the same markup. The mobile layout is CSS only.
 */
const FRAMES = [['desktop', 1200], ['phone', 375]] as const

afterEach(() => { document.body.innerHTML = ''; document.head.innerHTML = '' })

function mount(html: string, width: number): HTMLElement {
  const style = document.createElement('style')
  style.textContent = GEN_CSS
  document.head.appendChild(style)
  document.documentElement.lang = 'en'
  const main = document.createElement('main')
  main.style.width = `${width}px`
  main.innerHTML = html
  document.body.appendChild(main)
  return main
}

async function violations(root: HTMLElement) {
  const result = await axe.run(root, { rules: { 'color-contrast': { enabled: false } } })
  return result.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)
}

const cases = ONE_OF_EACH.flatMap(spec =>
  THEME_KEYS.flatMap(theme => FRAMES.map(([frame, width]) => ({ spec, theme, frame, width, archetype: spec.archetype }))),
)

describe.each(cases)('$archetype · $theme · $frame', ({ spec, theme, width }) => {
  const style = resolveSiteStyle(theme, '#1E88E5', 3)
  const render = () => mount(renderSection(spec, style, RICH), width)

  it('has no axe violations', async () => {
    expect(await violations(render())).toEqual([])
  })

  it('has exactly one h1, and the section is named by it', () => {
    const root = render()
    const h1s = root.querySelectorAll('h1')
    expect(h1s).toHaveLength(1)
    const section = root.querySelector('section')!
    expect(document.getElementById(section.getAttribute('aria-labelledby')!)).toBe(h1s[0])
  })

  it('makes the phone number a real tel: link', () => {
    expect(render().querySelector('a[data-call][href="tel:01134960000"]')).not.toBeNull()
  })

  it('gives every image alt text and every field a label', () => {
    const root = render()
    root.querySelectorAll('img').forEach(img => expect(img.getAttribute('alt')).toBeTruthy())
    root.querySelectorAll('input, textarea').forEach(field => {
      expect(root.querySelector(`label[for="${field.id}"]`)).not.toBeNull()
    })
  })

  it('announces star ratings as words', () => {
    render().querySelectorAll('.sb-stars').forEach(stars => {
      expect(stars.getAttribute('role')).toBe('img')
      expect(stars.getAttribute('aria-label')).toMatch(/^Rated [\d.]+ out of 5$/)
    })
  })
})

describe('hero stylesheet', () => {
  it('shows a visible focus ring on every interactive element', () => {
    expect(GEN_CSS).toMatch(/\.sb-hero :focus-visible\{outline:3px solid/)
  })

  it('turns off motion for people who ask for less', () => {
    expect(GEN_CSS).toContain('@media (prefers-reduced-motion: reduce)')
    // Transitions are only switched on for people who have not asked for reduced motion.
    expect(GEN_CSS.split('@media (prefers-reduced-motion: no-preference)')[0]).not.toMatch(/transition:/)
  })
})
