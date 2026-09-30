// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { plumber } from '../trades/plumber'
import { createSite } from '../site/defaults'
import { pageContent } from '../site/pageContent'
import { publishedPage } from '../site/page'
import { SECTION_NEEDS } from '../site/needs'
import { ExampleSection } from './ExampleSection'
import { SuggestedLinesEditor, SuggestedNoteEditor } from './content/SuggestedLinesEditor'

afterEach(cleanup)

const SUGGESTIONS = [['Quick replies', 'We call back the same day.'], ['Clear quotes', 'A written quote first.']] as const

describe('ExampleSection', () => {
  const site = { ...createSite(plumber, 3), business: { name: 'Joe Pipes', phone: '0113 496 0000', location: 'Leeds', about: '', yearsInBusiness: '', email: '' } }
  const content = pageContent(site, plumber)

  it('labels the example and says what to add, keeping the sample content from screen readers', () => {
    const { container } = render(<ExampleSection type="testimonials" site={site} content={content} needs={SECTION_NEEDS.testimonials!} />)
    expect(screen.getByText(/Add your customer reviews to show this/)).toBeTruthy()
    expect(screen.getByText('Example')).toBeTruthy()
    const body = container.querySelector('.mm-example-body')!
    expect(body.getAttribute('aria-hidden')).toBe('true')
    expect(body.hasAttribute('inert')).toBe(true)
    expect(body.querySelector('.sb-testimonials')).not.toBeNull()
  })

  it('is never part of the published page', () => {
    expect(publishedPage(site, plumber).map(s => s.type)).not.toContain('testimonials')
  })

  it('has no axe violations', async () => {
    const { container } = render(<ExampleSection type="areas" site={site} content={content} needs={SECTION_NEEDS.areas!} />)
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } })
    expect(result.violations.map(v => v.id)).toEqual([])
  })
})

describe('SuggestedLinesEditor', () => {
  it('offers suggestions unticked, and ticking one adds it', () => {
    const onChange = vi.fn()
    render(<SuggestedLinesEditor lines={null} suggestions={SUGGESTIONS} onChange={onChange} max={6} />)
    const box = screen.getByRole('checkbox', { name: /Quick replies/ }) as HTMLInputElement
    expect(box.checked).toBe(false)
    fireEvent.click(box)
    expect(onChange).toHaveBeenCalledWith([{ title: 'Quick replies', text: 'We call back the same day.' }])
  })

  it('unticking a chosen line removes it, and an empty choice is null', () => {
    const onChange = vi.fn()
    render(<SuggestedLinesEditor lines={[{ title: 'Quick replies', text: 'x' }]} suggestions={SUGGESTIONS} onChange={onChange} max={6} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /Quick replies/ }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('lets the customer reword a chosen line', () => {
    const onChange = vi.fn()
    render(<SuggestedLinesEditor lines={[{ title: 'Quick replies', text: 'x' }]} suggestions={SUGGESTIONS} onChange={onChange} max={6} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('A sentence about it'), { target: { value: 'Always within the hour.' } })
    expect(onChange).toHaveBeenCalledWith([{ title: 'Quick replies', text: 'Always within the hour.' }])
  })

  it('adds the customer’s own line', () => {
    const onChange = vi.fn()
    render(<SuggestedLinesEditor lines={null} suggestions={SUGGESTIONS} onChange={onChange} max={6} />)
    fireEvent.change(screen.getByLabelText('Or write your own'), { target: { value: 'We answer the phone ourselves' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(onChange).toHaveBeenCalledWith([{ title: 'We answer the phone ourselves', text: '' }])
  })

  it('has no axe violations', async () => {
    const { container } = render(<SuggestedLinesEditor lines={[{ title: 'Quick replies', text: 'x' }]} suggestions={SUGGESTIONS} onChange={() => {}} max={6} />)
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } })
    expect(result.violations.map(v => v.id)).toEqual([])
  })
})

describe('SuggestedNoteEditor', () => {
  it('adds the note only when ticked', () => {
    const onChange = vi.fn()
    render(<SuggestedNoteEditor note={null} suggestion="Certificates available on request." onChange={onChange} max={80} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /Certificates available on request/ }))
    expect(onChange).toHaveBeenCalledWith('Certificates available on request.')
  })
})
