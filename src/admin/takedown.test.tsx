// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import axe from 'axe-core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { findSite } from './adminApi'
import { FindSitePanel } from './panels/FindSitePanel'
import { ReviewPanel } from './panels/ReviewPanel'
import { doneMessage, standing } from './takedown'
import type { ReviewSite, SiteSummary } from './types'

const REF = 'a'.repeat(32)
const LIVE: SiteSummary = {
  ref: REF, name: "Joe's Bank", url: 'https://joes.localblocks.co.uk/', ownDomain: { hostname: 'www.joes.co.uk', status: 'active' }, email: 'joe@example.com',
  paid: true, published: true, refunded: false, disputed: false, disputeLost: false, takenDown: false, takedown: { takenDownAt: null, reason: null, by: null, restoredAt: null, restoredBy: null, log: [] },
}
const DOWN: SiteSummary = {
  ...LIVE, takenDown: true, ownDomain: { hostname: 'www.joes.co.uk', status: 'paused' },
  takedown: { takenDownAt: Date.UTC(2026, 9, 16), reason: 'Phishing login page', by: 'dashboard', restoredAt: null, restoredBy: null, log: [{ action: 'takedown', at: Date.UTC(2026, 9, 16), by: 'dashboard', reason: 'Phishing login page' }] },
}

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const noViolations = async (el: Element) =>
  expect((await axe.run(el, { rules: { 'color-contrast': { enabled: false } } })).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])

interface Seen { url: string; method: string; key: string | null; body: unknown }
function stubServer(answer: (url: string, body: Record<string, unknown> | null) => Response) {
  const seen: Seen[] = []
  vi.stubGlobal('fetch', vi.fn(async (u: RequestInfo | URL, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : null
    seen.push({ url: String(u), method: init?.method ?? 'GET', key: new Headers(init?.headers).get('X-Admin-Key'), body })
    // No Cloudflare Access in tests: the take-down is recorded as by "dashboard".
    if (String(u).includes('/cdn-cgi/')) return new Response('<!doctype html>', { status: 404 })
    return answer(String(u), body)
  }))
  return seen
}

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('the take-down words', () => {
  it('say where a site stands and what happened', () => {
    expect(standing(LIVE)).toBe('Paid and live')
    expect(standing(DOWN)).toBe('Taken down')
    expect(standing({ ...LIVE, refunded: true })).toBe('Refunded (down)')
    expect(doneMessage('takedown', 'Joe', { site: DOWN, domainPaused: true })).toBe('Joe is taken down. No email was sent: reply to the owner by hand.')
    expect(doneMessage('takedown', 'Joe', { site: DOWN, domainPaused: false })).toContain('paused by the next background check')
    expect(doneMessage('restore', 'Joe', { site: LIVE, domainResumed: true, stillDown: false })).toContain('Joe is back online.')
    expect(doneMessage('restore', 'Joe', { site: { ...LIVE, refunded: true }, stillDown: true })).toContain('stays down')
  })

  it('look a site up by reference or by address, with the admin key', async () => {
    const seen = stubServer(() => reply({ site: LIVE }))
    expect(await findSite('https://api.x', 'k', ` ${REF} `)).toEqual(LIVE)
    expect(await findSite('https://api.x', 'k', 'https://joes.co.uk/x')).toEqual(LIVE)
    expect(seen.map(s => [s.url, s.key])).toEqual([
      [`https://api.x/v1/admin/sites/lookup?ref=${REF}`, 'k'],
      ['https://api.x/v1/admin/sites/lookup?address=https%3A%2F%2Fjoes.co.uk%2Fx', 'k'],
    ])
  })
})

describe('Find a site', () => {
  it('finds a site, takes it down with a reason after confirming, then restores it', async () => {
    let current = LIVE
    const seen = stubServer((url, body) => {
      if (url.endsWith('/takedown')) { current = DOWN; return reply({ site: DOWN, domainPaused: true }) }
      if (url.endsWith('/restore')) { current = LIVE; return reply({ site: LIVE, domainResumed: true, stillDown: false }) }
      return body ? reply({}, 404) : reply({ site: current })
    })
    const { container } = render(<FindSitePanel base="https://api.x" adminKey="k" onRefused={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Site address'), { target: { value: 'joes.localblocks.co.uk' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find' }))
    const found = await screen.findByRole('region', { name: "Found: Joe's Bank" })
    expect(found.textContent).toContain('Paid and live')
    expect(found.textContent).toContain('www.joes.co.uk (active)')
    expect(within(found).getByRole('link', { name: 'joe@example.com' })).toBeTruthy()
    await noViolations(container)

    // Asks why, and won't go without a reason.
    const open = screen.getByRole('button', { name: "Take down Joe's Bank" })
    fireEvent.click(open)
    expect(open.getAttribute('aria-expanded')).toBe('true')
    const why = screen.getByLabelText('Why is it coming down?')
    expect(document.activeElement).toBe(why)
    expect(screen.getByRole('form', { name: "Take down Joe's Bank?" })).toBeTruthy()
    await noViolations(container)
    fireEvent.click(screen.getByRole('button', { name: 'Yes, take it down' }))
    expect(screen.getByRole('alert').textContent).toBe('Say why it’s coming down (a few words at least).')
    expect(seen.filter(s => s.method === 'POST')).toEqual([])

    // Cancel goes back to the button.
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(document.activeElement).toBe(open))
    fireEvent.click(open)
    fireEvent.change(screen.getByLabelText('Why is it coming down?'), { target: { value: '  Phishing login page ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Yes, take it down' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe("Joe's Bank is taken down. No email was sent: reply to the owner by hand."))
    expect(seen.filter(s => s.method === 'POST')).toEqual([
      { url: 'https://api.x/v1/admin/sites/takedown', method: 'POST', key: 'k', body: { ref: REF, reason: 'Phishing login page', by: 'dashboard' } },
    ])
    expect(screen.getByRole('region', { name: "Found: Joe's Bank" }).textContent).toContain('Phishing login page')
    expect(screen.queryByRole('form')).toBeNull()

    // Restore: confirms, no reason needed.
    const restore = screen.getByRole('button', { name: "Restore Joe's Bank" })
    fireEvent.click(restore)
    expect(screen.getByRole('form', { name: "Restore Joe's Bank?" })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Yes, restore it' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain("Joe's Bank is back online."))
    expect(seen.filter(s => s.method === 'POST').at(-1)).toEqual({ url: 'https://api.x/v1/admin/sites/restore', method: 'POST', key: 'k', body: { ref: REF, by: 'dashboard' } })
    expect(screen.getByRole('button', { name: "Take down Joe's Bank" })).toBeTruthy()
  })

  it('says when nothing is at an address, and hands a refused key back', async () => {
    stubServer(() => reply({ error: 'not_found', message: 'No site is at that address.' }, 404))
    render(<FindSitePanel base="https://api.x" adminKey="k" onRefused={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Find' }))
    expect(screen.getByRole('alert').textContent).toBe('Type a site’s address.')
    fireEvent.change(screen.getByLabelText('Site address'), { target: { value: 'nobody' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('No site is at that address.'))
    cleanup()
    stubServer(() => reply({ error: 'admin_key_needed', message: 'Enter the admin key.' }, 401))
    const onRefused = vi.fn()
    render(<FindSitePanel base="https://api.x" adminKey="k" onRefused={onRefused} />)
    fireEvent.change(screen.getByLabelText('Site address'), { target: { value: 'joes' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find' }))
    await waitFor(() => expect(onRefused).toHaveBeenCalledWith('Enter the admin key.'))
  })

  it('shows the server’s reason when a take-down is refused', async () => {
    stubServer((url, body) => (url.endsWith('/takedown') ? reply({ error: 'already_taken_down', message: 'That site is already taken down.' }, 409) : body ? reply({}, 404) : reply({ site: LIVE })))
    render(<FindSitePanel base="https://api.x" adminKey="k" onRefused={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Site address'), { target: { value: 'joes' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find' }))
    fireEvent.click(await screen.findByRole('button', { name: "Take down Joe's Bank" }))
    fireEvent.change(screen.getByLabelText('Why is it coming down?'), { target: { value: 'Scam' } })
    fireEvent.click(screen.getByRole('button', { name: 'Yes, take it down' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('That site is already taken down.'))
    expect((screen.getByRole('button', { name: 'Yes, take it down' }) as HTMLButtonElement).disabled).toBe(false)
  })
})

describe('Sites to review: take down', () => {
  const FLAGGED: ReviewSite = { ref: REF, slug: 'joes', name: "Joe's Bank", words: ['bank'], flaggedAt: Date.UTC(2026, 9, 1), paid: true, refunded: false, published: true, takenDown: false, url: 'https://joes.localblocks.co.uk/' }

  it('takes a flagged site down from its row, and the row says so', async () => {
    stubServer(url => (url.endsWith('/takedown') ? reply({ site: DOWN, domainPaused: true }) : reply({ sites: [FLAGGED] })))
    const { container } = render(<ReviewPanel base="https://api.x" adminKey="k" refresh={1} onRefused={vi.fn()} />)
    const row = (await screen.findAllByRole('row'))[1]
    fireEvent.click(within(row).getByRole('button', { name: "Take down: Joe's Bank" }))
    fireEvent.change(screen.getByLabelText('Why is it coming down?'), { target: { value: 'Phishing login page' } })
    await noViolations(container)
    fireEvent.click(screen.getByRole('button', { name: 'Yes, take it down' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain("Joe's Bank is taken down."))
    const after = screen.getAllByRole('row')[1]
    expect(after.textContent).toContain('Taken down')
    expect(within(after).queryByRole('link')).toBeNull()
    expect(within(after).getByRole('button', { name: "Restore: Joe's Bank" })).toBeTruthy()
  })
})
