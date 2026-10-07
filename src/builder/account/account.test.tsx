// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import axe from 'axe-core'
import type { Api } from '../../api/client'
import { EditLinkChoice } from './EditLinkChoice'
import { LostLinkScreen } from './LostLinkScreen'
import { PaidScreen } from './PaidScreen'
import { RefundScreen } from './RefundScreen'
import { screenFrom } from './screens'

afterEach(cleanup)

const TOKEN = `refund.${'a'.repeat(32)}.${'s'.repeat(43)}`
const noViolations = async (el: Element) =>
  expect((await axe.run(el, { rules: { 'color-contrast': { enabled: false } } })).violations.map(v => v.id)).toEqual([])
const fakeApi = (o: Partial<Api>) => o as Api

describe('which screen an address asks for', () => {
  it('routes Stripe’s return, refund links and lost links; everything else is the builder', () => {
    expect(screenFrom({ search: '?paid=cs_test_a1b2c3d4e5f6', hash: '' })).toEqual({ kind: 'paid', sessionId: 'cs_test_a1b2c3d4e5f6' })
    expect(screenFrom({ search: '?paid=<script>', hash: '' })).toEqual({ kind: 'builder', cancelled: false })
    expect(screenFrom({ search: '', hash: `#refund=${TOKEN}` })).toEqual({ kind: 'refund', token: TOKEN })
    expect(screenFrom({ search: '', hash: '#lost-link' })).toEqual({ kind: 'lost-link' })
    expect(screenFrom({ search: '?checkout=cancelled', hash: '' })).toEqual({ kind: 'builder', cancelled: true })
    expect(screenFrom({ search: '?trade=plumber', hash: '' })).toEqual({ kind: 'builder', cancelled: false })
  })
})

describe('payment received', () => {
  it('says it’s publishing, checks until the site is live, then links to it', async () => {
    const states = [{ state: 'waiting' as const }, { state: 'live' as const, url: 'https://joes.siteblocks.co.uk/' }]
    const checkoutStatus = vi.fn(async () => states.shift() ?? states[0])
    const { container } = render(<PaidScreen api={fakeApi({ checkoutStatus })} sessionId="cs_test_1234567890" every={10} />)
    expect(screen.getByRole('heading', { name: 'Payment received' })).toBeTruthy()
    expect(screen.getByText('Publishing your site…')).toBeTruthy()
    await noViolations(container)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Your site is live' })).toBeTruthy())
    expect(checkoutStatus).toHaveBeenCalledWith('cs_test_1234567890')
    expect(screen.getByRole('link', { name: 'Visit your site' }).getAttribute('href')).toBe('https://joes.siteblocks.co.uk/')
    expect(screen.getByText(/emailed your receipt and your edit link/)).toBeTruthy()
    await noViolations(container)
  })
})

describe('the refund link', () => {
  it('asks once, with one button, and confirms', async () => {
    const refund = vi.fn(async () => ({ state: 'refunded' as const, amount: 9900 }))
    const api = fakeApi({ refundStatus: vi.fn(async () => ({ state: 'ok' as const, amount: 9900, siteUrl: 'https://joes.siteblocks.co.uk/', until: '2026-10-20T00:00:00Z' })), refund })
    const { container } = render(<RefundScreen api={api} token={TOKEN} />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Refund £99 and take your site down?' })).toBeTruthy())
    expect(screen.getByText(/joes\.siteblocks\.co\.uk comes down straight away/)).toBeTruthy()
    expect(screen.getAllByRole('button')).toHaveLength(1)
    await noViolations(container)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Refund £99 and take my site down' })) })
    expect(refund).toHaveBeenCalledWith(TOKEN)
    expect(screen.getByRole('heading', { name: 'Your refund is on its way' })).toBeTruthy()
  })

  it('says when the guarantee has ended, or the link was used', async () => {
    render(<RefundScreen api={fakeApi({ refundStatus: vi.fn(async () => ({ state: 'expired' as const, support: 'help@siteblocks.co.uk' })) })} token={TOKEN} />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'The 14-day guarantee has ended' })).toBeTruthy())
    expect(screen.getByRole('link', { name: 'help@siteblocks.co.uk' }).getAttribute('href')).toBe('mailto:help@siteblocks.co.uk')
    expect(screen.queryByRole('button')).toBeNull()
    cleanup()
    render(<RefundScreen api={fakeApi({ refundStatus: vi.fn(async () => ({ state: 'used' as const })) })} token={TOKEN} />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Already refunded' })).toBeTruthy())
    cleanup()
    render(<RefundScreen api={fakeApi({ refundStatus: vi.fn(async () => ({ state: 'disputed' as const, support: 'help@siteblocks.co.uk' })) })} token={TOKEN} />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Your payment is being disputed' })).toBeTruthy())
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('an edit link in a browser building another site', () => {
  it('names both sites and offers one main button', async () => {
    const onChoose = vi.fn()
    const { container } = render(<EditLinkChoice conflict={{ here: 'Unpaid Ltd', link: 'Paid Ltd' }} onChoose={onChoose} />)
    await noViolations(container)
    expect(container.querySelectorAll('.sb-main-btn')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: /^Keep building/ }))
    expect(onChoose).toHaveBeenCalledWith(false)
    fireEvent.click(screen.getByRole('button', { name: /^Open/ }))
    expect(onChoose).toHaveBeenCalledWith(true)
  })
})

describe('lost your edit link?', () => {
  it('checks the email, sends the request and shows the same answer either way', async () => {
    const requestEditLink = vi.fn(async () => 'If that email paid for a site, a new edit link is on its way.')
    const { container } = render(<LostLinkScreen api={fakeApi({ requestEditLink })} />)
    await noViolations(container)
    const send = screen.getByRole('button', { name: 'Send me a new link' })
    fireEvent.change(screen.getByLabelText('Your email'), { target: { value: 'nope' } })
    await act(async () => { fireEvent.click(send) })
    expect(requestEditLink).not.toHaveBeenCalled()
    expect(screen.getByText(/doesn't look right/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Your email'), { target: { value: ' jo@example.com ' } })
    await act(async () => { fireEvent.click(send) })
    expect(requestEditLink).toHaveBeenCalledWith('jo@example.com')
    expect(screen.getByRole('heading', { name: 'Check your email' })).toBeTruthy()
  })
})
