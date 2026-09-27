// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { plumber } from '../../trades/plumber'
import { createSite } from '../../site/defaults'
import type { Site } from '../../site/schema'
import { FinishStep } from './FinishStep'

afterEach(cleanup)

const site = (patch: Partial<Site> = {}): Site => ({
  ...createSite(plumber),
  business: { name: 'Joe Pipes', phone: '0113 496 0000', location: 'Leeds', about: '', yearsInBusiness: '', email: '' },
  extras: ['reviews'],
  ...patch,
})

const renderStep = (s: Site, handlers: Partial<Parameters<typeof FinishStep>[0]> = {}) =>
  render(
    <FinishStep
      trade={plumber}
      site={s}
      onBusinessChange={vi.fn()}
      onEditSection={vi.fn()}
      onPublish={vi.fn()}
      onBack={vi.fn()}
      {...handlers}
    />,
  ).container

describe('FinishStep (go live)', () => {
  it('has no axe violations', async () => {
    const result = await axe.run(renderStep(site()), { rules: { 'color-contrast': { enabled: false } } })
    expect(result.violations.map(v => v.id)).toEqual([])
  })

  it('shows what is live and what stays hidden', () => {
    const withAreas = site({ content: { ...createSite(plumber).content, areas: ['Headingley'] } })
    renderStep(withAreas)
    expect(screen.getByRole('button', { name: 'Add Customer reviews' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Add Areas you cover' })).toBeNull()
    expect(screen.getByText('Areas you cover')).toBeTruthy()
  })

  it('jumps back to the right section to add something', () => {
    const onEditSection = vi.fn()
    renderStep(site(), { onEditSection })
    fireEvent.click(screen.getByRole('button', { name: 'Add Customer reviews' }))
    expect(onEditSection).toHaveBeenCalledWith('testimonials')
  })

  it('blocks publishing until there is a valid email', () => {
    const onPublish = vi.fn()
    renderStep(site(), { onPublish })
    expect((screen.getByRole('button', { name: /publish/i }) as HTMLButtonElement).disabled).toBe(true)
    cleanup()
    renderStep(site({ business: { ...site().business, email: 'joe@example.com' } }), { onPublish })
    fireEvent.click(screen.getByRole('button', { name: /publish/i }))
    expect(onPublish).toHaveBeenCalled()
  })
})
