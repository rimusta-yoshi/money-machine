// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { plumber } from '../../trades/plumber'
import { createSite } from '../../site/defaults'
import type { Site } from '../../site/schema'
import { ListEditor } from './ListEditor'
import { SectionContentEditor } from './SectionContentEditor'

afterEach(cleanup)

describe('ListEditor', () => {
  const setup = (items: string[] | null, onChange = vi.fn()) => {
    render(<ListEditor label="Areas you cover" items={items} onChange={onChange} placeholder="e.g. Headingley" max={3} maxLength={60} />)
    return onChange
  }

  it('adds a trimmed item with the Add button', () => {
    const onChange = setup(['Leeds'])
    fireEvent.change(screen.getByLabelText('Areas you cover'), { target: { value: '  Roundhay ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(onChange).toHaveBeenCalledWith(['Leeds', 'Roundhay'])
  })

  it('adds with Enter and ignores blanks and duplicates', () => {
    const onChange = setup(['Leeds'])
    const input = screen.getByLabelText('Areas you cover')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.change(input, { target: { value: 'leeds' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('removes an item, and reports null when the list empties', () => {
    const onChange = setup(['Leeds'])
    fireEvent.click(screen.getByRole('button', { name: 'Remove Leeds' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('stops adding at the maximum', () => {
    setup(['A', 'B', 'C'])
    expect((screen.getByRole('button', { name: 'Add' }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('SectionContentEditor', () => {
  const site = (): Site => ({ ...createSite(plumber), extras: ['reviews'] })
  const renderEditor = (section: Parameters<typeof SectionContentEditor>[0]['section'], onContentChange = vi.fn()) => {
    const container = render(<SectionContentEditor site={site()} trade={plumber} section={section} onContentChange={onContentChange} />).container
    return { container, onContentChange }
  }

  it('has no axe violations for any section', async () => {
    for (const section of ['hero', 'trust_bar', 'about', 'testimonials', 'areas', 'contact'] as const) {
      const { container } = renderEditor(section)
      const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
      expect(result.violations.map(v => v.id), section).toEqual([])
      cleanup()
    }
  })

  it('shows only the fields that belong to the section', () => {
    renderEditor('testimonials')
    expect(screen.getByText('Your star rating')).toBeTruthy()
    expect(screen.getByText('Customer reviews')).toBeTruthy()
    expect(screen.queryByText('Areas you cover')).toBeNull()
  })

  it('says so when a section has nothing to fill in', () => {
    renderEditor('footer')
    expect(screen.getByText(/Nothing to fill in here/)).toBeTruthy()
  })

  it('saves an emergency answer as content', () => {
    const { onContentChange } = renderEditor('services')
    fireEvent.click(screen.getByLabelText('No'))
    expect(onContentChange).toHaveBeenCalledWith({ emergency: false })
  })
})
