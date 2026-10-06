// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { plumber } from '../../trades/plumber'
import { createSite } from '../../site/defaults'
import type { Site } from '../../site/schema'
import type { Draft } from '../../api/useDraft'
import { FinishStep } from './FinishStep'

afterEach(cleanup)

const site = (patch: Partial<Site> = {}): Site => ({
  ...createSite(plumber),
  business: { name: 'Joe Pipes', phone: '0113 496 0000', location: 'Leeds', about: '', yearsInBusiness: '', email: '' },
  extras: ['reviews'],
  ...patch,
})
const withEmail = () => site({ business: { ...site().business, email: 'joe@example.com' } })

type Handlers = Partial<Parameters<typeof FinishStep>[0]>
const renderStep = (s: Site, handlers: Handlers = {}) =>
  render(
    <FinishStep
      trade={plumber}
      site={s}
      onBusinessChange={vi.fn()}
      onEditSection={vi.fn()}
      onEditStep={vi.fn()}
      draft={null}
      adminPublish={false}
      domain="siteblocks.co.uk"
      verify={vi.fn(async () => s)}
      onReset={vi.fn()}
      {...handlers}
    />,
  ).container

const goLive = () => screen.getByRole('button', { name: /Go live for £99/ })

describe('FinishStep (go live)', () => {
  it('has no axe violations', async () => {
    const result = await axe.run(renderStep(site()), { rules: { 'color-contrast': { enabled: false } } })
    expect(result.violations.map(v => v.id)).toEqual([])
  })

  it('sums up the basics, the look and the sections, each with a way back to edit', () => {
    const onEditStep = vi.fn()
    renderStep(site(), { onEditStep })
    expect(screen.getByText(/plumber in Leeds, 0113 496 0000/)).toBeTruthy()
    expect(screen.getByText(/Clean Pro in your colour/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Edit your look' }))
    expect(onEditStep).toHaveBeenCalledWith('look')
    fireEvent.click(screen.getByRole('button', { name: 'Edit basics' }))
    expect(onEditStep).toHaveBeenCalledWith('basics')
  })

  it('lists only what stays hidden, and jumps back to the right section to add it', () => {
    const onEditSection = vi.fn()
    renderStep(site({ content: { ...createSite(plumber).content, areas: ['Headingley'] } }), { onEditSection })
    expect(screen.queryByRole('button', { name: 'Add Areas you cover' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Add Customer reviews' }))
    expect(onEditSection).toHaveBeenCalledWith('testimonials')
  })

  it('asks for the email here, for the receipt and edit link', () => {
    const onBusinessChange = vi.fn()
    renderStep(site(), { onBusinessChange })
    const email = screen.getByLabelText('Your email')
    expect(email.getAttribute('aria-describedby')).toBeTruthy()
    expect(screen.getByText(/receipt and a link to edit your site/)).toBeTruthy()
    fireEvent.change(email, { target: { value: 'joe@example.com' } })
    expect(onBusinessChange).toHaveBeenCalledWith({ email: 'joe@example.com' })
  })

  it('won’t go live without a valid email, and says why', () => {
    const verify = vi.fn(async () => site())
    renderStep(site(), { verify })
    fireEvent.click(goLive())
    expect(screen.getByText('Add your email so we can send your receipt and edit link.')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByLabelText('Your email'))
    expect(verify).not.toHaveBeenCalled()
  })

  it('says plainly when this build can’t publish', () => {
    renderStep(withEmail())
    fireEvent.click(goLive())
    expect(screen.getByText(/isn’t switched on/)).toBeTruthy()
  })

  it('shows the price and the refund placeholder, and promises no card payment before payments open', () => {
    renderStep(site())
    expect(screen.getByText('£99')).toBeTruthy()
    expect(screen.getByText(/\[REFUND POLICY\]/)).toBeTruthy()
    expect(screen.queryByText(/Stripe/)).toBeNull()
  })

  it('checks every section, then publishes to the chosen address with the admin key', async () => {
    const publish = vi.fn(async (slug: string) => ({ slug, url: `https://${slug}.siteblocks.co.uk/` }))
    const draft = {
      enabled: true, key: 'k', published: null, saveNow: vi.fn(async () => null),
      slugStatus: vi.fn(async () => ({ available: true, url: 'https://joe-pipes.siteblocks.co.uk/' })), publish,
    } as unknown as Draft
    // The check can change a layout; exactly the checked record is what goes up.
    const checked = { ...withEmail(), rhythm: {} }
    const verify = vi.fn(async () => checked)
    renderStep(withEmail(), { draft, adminPublish: true, verify })
    expect((screen.getByLabelText('Your web address') as HTMLInputElement).value).toBe('joe-pipes')
    fireEvent.change(screen.getByLabelText('Admin key'), { target: { value: 'secret' } })
    await act(async () => { fireEvent.click(goLive()) })
    expect(verify).toHaveBeenCalled()
    expect(publish).toHaveBeenCalledWith('joe-pipes', 'secret', checked)
    expect(screen.getByRole('link', { name: 'joe-pipes.siteblocks.co.uk' })).toBeTruthy()
  })
})
