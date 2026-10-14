// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { PACKS } from '../../packs'
import { tradeFromSearch } from '../steps'
import { NotListed } from './NotListed'

afterEach(cleanup)
const AXE = { rules: { 'color-contrast': { enabled: false } } }

function setup() {
  const onPick = vi.fn()
  const onRequest = vi.fn()
  const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
  const view = render(<form onSubmit={onSubmit}><NotListed onPick={onPick} onRequest={onRequest} /></form>)
  fireEvent.click(screen.getByRole('button', { name: 'My business isn’t listed' }))
  const field = screen.getByLabelText('What’s your business?')
  return { ...view, onPick, onRequest, onSubmit, field }
}

describe('My business isn’t listed', () => {
  it('opens from a button that says whether it’s open', () => {
    render(<NotListed onPick={vi.fn()} />)
    const toggle = screen.getByRole('button', { name: 'My business isn’t listed' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
  })

  it('notes the request once and suggests the closest type to start with', async () => {
    const { field, onRequest, onPick, container } = setup()
    fireEvent.change(field, { target: { value: 'Sparky' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find the closest match' }))
    fireEvent.click(screen.getByRole('button', { name: 'Find the closest match' }))
    expect(onRequest).toHaveBeenCalledTimes(1)
    expect(onRequest).toHaveBeenCalledWith('sparky', 'electrician')
    expect(screen.getByRole('status').textContent).toContain('the closest we have is Electrician')
    fireEvent.click(screen.getByRole('button', { name: 'Start with Electrician' }))
    expect(onPick.mock.calls[0][0].id).toBe('electrician')
    expect((await axe.run(container, AXE)).violations.map(v => v.id)).toEqual([])
  })

  it('still notes a business we have nothing close to', () => {
    const { field, onRequest } = setup()
    fireEvent.change(field, { target: { value: 'florist' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(onRequest).toHaveBeenCalledWith('florist', null)
    expect(screen.getByRole('status').textContent).toContain('Nothing we have is close yet')
  })

  it('never sends contact details, and Enter never submits the basics form', () => {
    const { field, onRequest, onSubmit } = setup()
    fireEvent.change(field, { target: { value: 'call 07700 900123' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(onRequest).not.toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('status').textContent).toContain('Tell us in a few words')
  })
})

describe('the trade picked from a link (/build/?trade=…)', () => {
  it.each(PACKS.map(p => p.id))('%s is preselected, with or without an ad source', id => {
    expect(tradeFromSearch(`?trade=${id}`)).toBe(id)
    expect(tradeFromSearch(`?trade=${id}&src=fb&utm_campaign=oct`)).toBe(id)
  })
})
