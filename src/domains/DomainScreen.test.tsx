// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import type { Api, DomainAnswer, OwnDomain } from '../api/client'
import { ApiError } from '../api/client'
import { BRAND } from '../brand/config'
import { screenFrom } from '../builder/account/screens'
import { DomainScreen } from './DomainScreen'

afterEach(cleanup)
beforeEach(() => localStorage.clear())

const KEY = 'k'.repeat(43)
const TOKEN = `edit.${'a'.repeat(32)}.1.${'s'.repeat(43)}`
const noViolations = async (el: Element) =>
  expect((await axe.run(el, { rules: { 'color-contrast': { enabled: false } } })).violations.map(v => v.id)).toEqual([])

const pending = (o: Partial<OwnDomain> = {}): OwnDomain => ({
  hostname: 'www.smithplumbing.co.uk', domain: 'smithplumbing.co.uk', host: 'www', apex: null, status: 'pending',
  provider: 'godaddy', providerName: 'GoDaddy', records: [{ type: 'CNAME', name: 'www', value: 'domains.localblocks.co.uk' }],
  pointsElsewhere: null, oneClick: null, verified: false, liveUrl: null, checkedAt: 1, ...o,
})
const answer = (domain: OwnDomain | null): DomainAnswer => ({ domain, freeUrl: 'https://smith.localblocks.co.uk/', available: true })
const fakeApi = (o: Partial<Api>) => o as Api

describe('the address', () => {
  it('opens the domain page from #domain, an emailed link or a return from the domain company', () => {
    expect(screenFrom({ search: '', hash: '#domain' })).toEqual({ kind: 'domain', token: '', back: null })
    expect(screenFrom({ search: '', hash: `#domain=${TOKEN}` })).toEqual({ kind: 'domain', token: TOKEN, back: null })
    expect(screenFrom({ search: '?domain=back&state=domain', hash: '' })).toEqual({ kind: 'domain', token: '', back: 'done' })
    expect(screenFrom({ search: '?domain=back&error=access_denied', hash: '' })).toEqual({ kind: 'domain', token: '', back: 'cancelled' })
    expect(screenFrom({ search: '', hash: '#domain=nonsense' })).toEqual({ kind: 'builder', cancelled: false })
  })
})

describe('use your own domain', () => {
  it('without a key, points to the edit link', () => {
    render(<DomainScreen api={fakeApi({})} token="" back={null} />)
    expect(screen.getByText(/Open the edit link from your welcome email/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Email me a new link' }).getAttribute('href')).toBe('#lost-link')
  })

  it('asks for the domain, checks it as typed, and connects it', async () => {
    localStorage.setItem('localblocks.draft', KEY)
    const connectDomain = vi.fn(async () => answer(pending()))
    const api = fakeApi({ domain: vi.fn(async () => answer(null)), connectDomain })
    const { container } = render(<DomainScreen api={api} token="" back={null} />)
    const input = await screen.findByLabelText('Your domain')
    expect(screen.getByRole('heading', { name: 'Don’t have a domain yet?' })).toBeTruthy()
    expect(screen.getByRole('link', { name: new RegExp(`^${BRAND.domainShop.name} ?\\(opens in a new tab\\)$`) }).getAttribute('href')).toBe(BRAND.domainShop.url)
    expect(screen.getByRole('link', { name: /^Host your own site ?\(opens in a new tab\)$/ })).toBeTruthy()
    await noViolations(container)

    fireEvent.change(input, { target: { value: 'not a domain' } })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Connect my domain' })) })
    expect(connectDomain).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toMatch(/doesn’t look like a domain/)

    fireEvent.change(input, { target: { value: 'SmithPlumbing.co.uk' } })
    expect(screen.getByText('www.smithplumbing.co.uk')).toBeTruthy()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Connect my domain' })) })
    expect(connectDomain).toHaveBeenCalledWith(KEY, 'SmithPlumbing.co.uk')
    expect(screen.getByText('Waiting for your domain')).toBeTruthy()
  })

  it('shows the server’s reason when it can’t connect', async () => {
    localStorage.setItem('localblocks.draft', KEY)
    const api = fakeApi({
      domain: vi.fn(async () => answer(null)),
      connectDomain: vi.fn(async () => { throw new ApiError(409, 'domain_taken', 'That domain is already connected to another site.') }),
    })
    render(<DomainScreen api={api} token="" back={null} />)
    fireEvent.change(await screen.findByLabelText('Your domain'), { target: { value: 'jones.co.uk' } })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Connect my domain' })) })
    expect(screen.getByRole('alert').textContent).toBe('That domain is already connected to another site.')
  })

  it('while waiting, shows only their company’s steps with the record to copy, and checks again', async () => {
    const domain = vi.fn(async () => answer(pending()))
    const { container } = render(<DomainScreen api={fakeApi({ domain })} token={TOKEN} back={null} />)
    expect(await screen.findByRole('heading', { name: 'At GoDaddy' })).toBeTruthy()
    expect(domain).toHaveBeenCalledWith(TOKEN)
    expect(screen.getByText(/Sign in to GoDaddy/)).toBeTruthy()
    expect(screen.queryByText(/IONOS/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Copy CNAME value: domains.localblocks.co.uk' })).toBeTruthy()
    expect(screen.getByText(/Optional, but worth it/)).toBeTruthy()
    await noViolations(container)
    // Back from another tab: asked again.
    await act(async () => { window.dispatchEvent(new Event('focus')) })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Check now' })) })
    expect(domain.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('shows the ownership TXT record next to the CNAME, and says when it isn’t seen yet', async () => {
    const records: OwnDomain['records'] = [
      { type: 'CNAME', name: 'www', value: 'domains.localblocks.co.uk' },
      { type: 'TXT', name: '_cf-custom-hostname.www', value: 'abc-123' },
    ]
    const { container } = render(<DomainScreen api={fakeApi({ domain: vi.fn(async () => answer(pending({ records }))) })} token={TOKEN} back={null} />)
    expect(await screen.findByRole('button', { name: 'Copy TXT value: abc-123' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copy TXT name: _cf-custom-hostname.www' })).toBeTruthy()
    expect(screen.getByText(/Not seen yet: the TXT record/)).toBeTruthy()
    await noViolations(container)
  })

  it('offers one click where the domain company supports it, with the steps behind it', async () => {
    const api = fakeApi({ domain: vi.fn(async () => answer(pending({ oneClick: { name: 'GoDaddy', url: 'https://dcc.godaddy.com/apply?x' } }))) })
    const { container } = render(<DomainScreen api={api} token={TOKEN} back={null} />)
    const button = await screen.findByRole('link', { name: 'Connect automatically with GoDaddy' })
    expect(button.getAttribute('href')).toBe('https://dcc.godaddy.com/apply?x')
    expect(screen.getByText('Or set it up by hand')).toBeTruthy()
    await noViolations(container)
  })

  it('uses general steps for a company we don’t know, and says when the record points elsewhere', async () => {
    const api = fakeApi({ domain: vi.fn(async () => answer(pending({ provider: null, providerName: null, pointsElsewhere: 'parked.example.net' }))) })
    render(<DomainScreen api={api} token={TOKEN} back={null} />)
    expect(await screen.findByRole('heading', { name: 'At your domain company' })).toBeTruthy()
    expect(screen.getByText(/find its/)).toBeTruthy()
    expect(screen.getByText('parked.example.net')).toBeTruthy()
  })

  it('says thanks after the domain company, or that nothing changed', async () => {
    localStorage.setItem('localblocks.draft', KEY)
    const api = fakeApi({ domain: vi.fn(async () => answer(pending())) })
    render(<DomainScreen api={api} token="" back="cancelled" />)
    expect(await screen.findByText(/nothing changed/)).toBeTruthy()
  })

  it('once live, links to it and can disconnect after asking', async () => {
    const live = pending({ status: 'active', liveUrl: 'https://www.smithplumbing.co.uk/' })
    const disconnectDomain = vi.fn(async () => answer(null))
    const { container } = render(<DomainScreen api={fakeApi({ domain: vi.fn(async () => answer(live)), disconnectDomain })} token={TOKEN} back={null} />)
    expect((await screen.findByRole('link', { name: 'www.smithplumbing.co.uk' })).getAttribute('href')).toBe('https://www.smithplumbing.co.uk/')
    expect(screen.getByText('Live')).toBeTruthy()
    await noViolations(container)
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect www.smithplumbing.co.uk' }))
    expect(disconnectDomain).not.toHaveBeenCalled()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Yes, disconnect' })) })
    expect(disconnectDomain).toHaveBeenCalledWith(TOKEN)
    expect(screen.getByLabelText('Your domain')).toBeTruthy()
  })

  it('a replaced edit link says so', async () => {
    const api = fakeApi({ domain: vi.fn(async () => { throw new ApiError(401, 'unknown_draft', 'No.') }) })
    render(<DomainScreen api={api} token={TOKEN} back={null} />)
    expect(await screen.findByText(/replaced by a newer one/)).toBeTruthy()
  })
})
