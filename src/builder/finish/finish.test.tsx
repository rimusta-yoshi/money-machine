// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { plumber } from '../../trades/plumber'
import { createSite } from '../../site/defaults'
import type { Site } from '../../site/schema'
import { ListEditor } from './ListEditor'
import { FinishStep } from './FinishStep'

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

describe('FinishStep', () => {
  const site = (): Site => ({
    ...createSite(plumber),
    business: { name: 'Joe Pipes', phone: '0113 496 0000', location: 'Leeds', about: '', yearsInBusiness: '', email: '' },
    extras: ['reviews'],
  })

  const renderStep = (s: Site, handlers: Partial<Parameters<typeof FinishStep>[0]> = {}) =>
    render(
      <FinishStep
        trade={plumber}
        site={s}
        onBusinessChange={vi.fn()}
        onContentChange={vi.fn()}
        onPublish={vi.fn()}
        onBack={vi.fn()}
        {...handlers}
      />,
    ).container

  it('has no axe violations', async () => {
    const result = await axe.run(renderStep(site()), { rules: { 'color-contrast': { enabled: false } } })
    expect(result.violations.map(v => v.id)).toEqual([])
  })

  it('lists what still shows examples, including reviews when that extra is on', () => {
    renderStep(site())
    expect(screen.getByText('Customer reviews')).toBeTruthy()
    expect(screen.getByText('Areas you cover')).toBeTruthy()
  })

  it('blocks publishing until there is a valid email', () => {
    const onPublish = vi.fn()
    renderStep(site(), { onPublish })
    const publish = screen.getByRole('button', { name: /publish/i })
    expect((publish as HTMLButtonElement).disabled).toBe(true)
    cleanup()
    const withEmail = { ...site(), business: { ...site().business, email: 'joe@example.com' } }
    renderStep(withEmail, { onPublish })
    fireEvent.click(screen.getByRole('button', { name: /publish/i }))
    expect(onPublish).toHaveBeenCalled()
  })

  it('saves an emergency answer as content', () => {
    const onContentChange = vi.fn()
    renderStep(site(), { onContentChange })
    fireEvent.click(screen.getByLabelText('No'))
    expect(onContentChange).toHaveBeenCalledWith({ emergency: false })
  })
})
