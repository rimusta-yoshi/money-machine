// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { CharCount } from './CharCount'
import { counted } from './counted'

afterEach(cleanup)

describe('CharCount', () => {
  it('stays hidden until the field is 70% full', () => {
    const { container } = render(<CharCount id="c" value={'x'.repeat(27)} max={40} />)
    expect(container.querySelector('#c')?.hasAttribute('hidden')).toBe(true)
    expect(counted('c', 'x'.repeat(27), 40)['aria-describedby']).toBeUndefined()
  })

  it('shows "n of max" near the limit and is linked to its field', () => {
    render(<><input aria-label="Town" {...counted('c', 'x'.repeat(30), 40)} /><CharCount id="c" value={'x'.repeat(30)} max={40} /></>)
    expect(screen.getByText('30 of 40 characters')).toBeTruthy()
    expect(screen.getByLabelText('Town').getAttribute('aria-describedby')).toBe('c')
    expect(screen.getByLabelText('Town').getAttribute('maxlength')).toBe('40')
  })

  it('says gently when the field is full', () => {
    render(<CharCount id="c" value={'x'.repeat(40)} max={40} />)
    expect(screen.getByText(/40 of 40 characters: that’s the most that fits/)).toBeTruthy()
  })
})
