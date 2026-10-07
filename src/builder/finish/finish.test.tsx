// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { plumber } from '../../trades/plumber'
import { createSite } from '../../site/defaults'
import type { Site } from '../../site/schema'
import type { Draft } from '../../api/useDraft'
import { FinishStep } from './FinishStep'
import { GoLivePanel } from './GoLivePanel'

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

  it('shows the price, the money-back guarantee and who takes the card', () => {
    renderStep(site())
    expect(screen.getByText('£99')).toBeTruthy()
    expect(screen.getByText(/14-day money-back guarantee, no questions asked\./)).toBeTruthy()
    expect(screen.getByText(/card payment by Stripe/)).toBeTruthy()
  })

  const fakeDraft = (o: Partial<Draft> = {}) => ({
    enabled: true, key: 'k', published: null, account: { paid: false, refunded: false },
    slugStatus: vi.fn(async () => ({ available: true, url: 'https://joe-pipes.siteblocks.co.uk/' })),
    publish: vi.fn(async (slug?: string) => ({ slug: slug ?? 'joe-pipes', url: `https://${slug ?? 'joe-pipes'}.siteblocks.co.uk/` })),
    checkout: vi.fn(async () => 'https://checkout.stripe.com/c/pay/cs_test_1'),
    ...o,
  }) as unknown as Draft & { publish: ReturnType<typeof vi.fn>; checkout: ReturnType<typeof vi.fn> }
  // The check can change a layout; exactly the checked record is what goes up.
  const checked = { ...withEmail(), rhythm: {} }

  it('checks every section, then goes to Stripe for the chosen address', async () => {
    const draft = fakeDraft()
    const verify = vi.fn(async () => checked)
    const redirect = vi.fn()
    render(<GoLivePanel site={withEmail()} trade={plumber} draft={draft} adminPublish={false} domain="siteblocks.co.uk" onBusinessChange={vi.fn()} verify={verify} redirect={redirect} />)
    expect((screen.getByLabelText('Your web address') as HTMLInputElement).value).toBe('joe-pipes')
    await act(async () => { fireEvent.click(goLive()) })
    expect(verify).toHaveBeenCalled()
    expect(draft.checkout).toHaveBeenCalledWith('joe-pipes', checked, undefined)
    expect(redirect).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_test_1')
    expect(draft.publish).not.toHaveBeenCalled()
  })

  it('before launch, takes no order without a tester code, and sends the code when given', async () => {
    sessionStorage.clear()
    const draft = fakeDraft()
    const redirect = vi.fn()
    const shop = { pricePence: 9900, currency: 'gbp', launched: false, refundDays: 14 }
    render(<GoLivePanel site={withEmail()} trade={plumber} draft={draft} adminPublish={false} domain="siteblocks.co.uk" onBusinessChange={vi.fn()} verify={vi.fn(async () => checked)} shop={shop} redirect={redirect} />)
    await act(async () => { fireEvent.click(goLive()) })
    expect(screen.getByText(/not taking orders yet\. Your site is kept/)).toBeTruthy()
    expect(draft.checkout).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Tester code'), { target: { value: ' tester-1234 ' } })
    await act(async () => { fireEvent.click(goLive()) })
    expect(draft.checkout).toHaveBeenCalledWith('joe-pipes', checked, 'tester-1234')
    expect(sessionStorage.getItem('siteblocks.tester')).toBe('tester-1234')
  })

  it('shows the price the server asks, and no tester field once launched', () => {
    renderStep(withEmail(), { draft: fakeDraft(), shop: { pricePence: 7900, currency: 'gbp', launched: true, refundDays: 14 } })
    expect(screen.getByText('£79')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Go live for £79' })).toBeTruthy()
    expect(screen.queryByLabelText('Tester code')).toBeNull()
  })

  it('needs a valid email before going to Stripe', async () => {
    const draft = fakeDraft()
    renderStep(site(), { draft })
    await act(async () => { fireEvent.click(goLive()) })
    expect(screen.getByText(/Add your email/)).toBeTruthy()
    expect(draft.checkout).not.toHaveBeenCalled()
  })

  it('publishes without paying only with the admin key (testing builds)', async () => {
    const draft = fakeDraft()
    renderStep(withEmail(), { draft, adminPublish: true, verify: vi.fn(async () => checked) })
    fireEvent.change(screen.getByLabelText('Admin key'), { target: { value: 'secret' } })
    await act(async () => { fireEvent.click(goLive()) })
    expect(draft.publish).toHaveBeenCalledWith('joe-pipes', 'secret', checked)
    expect(draft.checkout).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'joe-pipes.siteblocks.co.uk' })).toBeTruthy()
  })

  it('re-publishes a paid site for free, at the address it paid for', async () => {
    const draft = fakeDraft({ account: { paid: true, refunded: false }, published: { slug: 'joes-old', url: 'https://joes-old.siteblocks.co.uk/' } })
    renderStep(withEmail(), { draft, adminPublish: true, verify: vi.fn(async () => checked) })
    const address = screen.getByLabelText('Your web address') as HTMLInputElement
    expect(address.value).toBe('joes-old')
    expect(address.readOnly).toBe(true)
    expect(screen.queryByText('£99')).toBeNull()
    expect(screen.queryByLabelText('Admin key')).toBeNull()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Publish changes' })) })
    expect(draft.publish).toHaveBeenCalledWith(undefined, undefined, checked)
    expect(draft.checkout).not.toHaveBeenCalled()
  })

  it('says a cancelled payment took nothing, and that a refunded site is down', () => {
    renderStep(withEmail(), { draft: fakeDraft(), cancelled: true })
    expect(screen.getByText(/Payment cancelled: nothing was taken/)).toBeTruthy()
    cleanup()
    renderStep(withEmail(), { draft: fakeDraft({ account: { paid: true, refunded: true } }) })
    expect(screen.getByText(/refunded and taken down/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Go live/ })).toBeNull()
  })
})
