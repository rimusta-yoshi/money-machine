import { describe, expect, it } from 'vitest'
import { contrastRatio } from './contrast'
import { siteTheme, textOnWhite } from './theme'

const SAMPLES = ['#1E88E5', '#2563EB', '#0891B2', '#3F8F4F', '#F59E0B', '#EA580C', '#C2410C', '#DC2626', '#7C3AED', '#374151', '#FFFF00', '#FFFFFF']

describe('textOnWhite', () => {
  it('returns a shade of the brand readable as small text on white', () => {
    for (const brand of SAMPLES) {
      expect(contrastRatio(textOnWhite(brand), '#FFFFFF'), brand).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps already-dark colours unchanged', () => {
    expect(textOnWhite('#0B2545')).toBe('#0B2545')
  })
})

describe('siteTheme', () => {
  it('sets brand, text and button colours as CSS variables', () => {
    const vars = siteTheme('#F59E0B', '#0B2545') as Record<string, string>
    expect(vars['--accent']).toBe('#F59E0B')
    expect(vars['--navy']).toBe('#0B2545')
    expect(contrastRatio(vars['--accent-ink'], '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(vars['--btn-bg'], vars['--btn-ink'])).toBeGreaterThanOrEqual(4.5)
  })
})
