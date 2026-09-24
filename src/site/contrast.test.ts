import { describe, expect, it } from 'vitest'
import { buttonColors, contrastRatio } from './contrast'

const PRESETS = ['#1E88E5', '#2563EB', '#0891B2', '#3F8F4F', '#F59E0B', '#EA580C', '#C2410C', '#DC2626', '#7C3AED', '#374151']

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for identical colours', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1)
    expect(contrastRatio('#1E88E5', '#1E88E5')).toBeCloseTo(1, 5)
  })

  it('is symmetric', () => {
    expect(contrastRatio('#F59E0B', '#FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#F59E0B'), 5)
  })
})

describe('buttonColors', () => {
  it('leaves dark brand colours alone with white text', () => {
    expect(buttonColors('#0B2545')).toEqual({ bg: '#0B2545', ink: '#FFFFFF' })
  })

  it('darkens a mid blue just enough for white text to pass', () => {
    const { bg, ink } = buttonColors('#1E88E5')
    expect(ink).toBe('#FFFFFF')
    expect(bg).not.toBe('#1E88E5')
    expect(contrastRatio(bg, ink)).toBeGreaterThanOrEqual(4.5)
  })

  it('switches to dark text on light colours like amber instead of muddying them', () => {
    expect(buttonColors('#F59E0B')).toEqual({ bg: '#F59E0B', ink: '#000000' })
  })

  it('meets WCAG AA (4.5:1) for every preset and for any colour a customer might pick', () => {
    const samples = [...PRESETS, '#FFFFFF', '#000000', '#FFFF00', '#00FF00', '#FF00FF', '#808080', '#777777', '#00AAFF']
    for (const brand of samples) {
      const { bg, ink } = buttonColors(brand)
      expect(contrastRatio(bg, ink), brand).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('handles lowercase hex', () => {
    expect(buttonColors('#0b2545').ink).toBe('#FFFFFF')
  })
})
