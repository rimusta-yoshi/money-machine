// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearReview, fetchReview } from './adminApi'
import { ReviewPanel } from './panels/ReviewPanel'
import type { ReviewSite } from './types'

const SITE: ReviewSite = {
  ref: 'a'.repeat(32), slug: 'joes', name: "Joe's Bank", words: ['bank', 'password'], flaggedAt: Date.UTC(2026, 9, 1), paid: true, refunded: false, url: 'https://joes.localblocks.co.uk/',
}
const OTHER: ReviewSite = { ...SITE, ref: 'b'.repeat(32), slug: null, name: null, words: ['crypto'], paid: false, url: null }

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('the review calls', () => {
  it('send the admin key, and say the server’s reason when refused', async () => {
    const seen: { url: string; key: string | null; body: unknown }[] = []
    const fetcher = vi.fn(async (u: RequestInfo | URL, init?: RequestInit) => {
      seen.push({ url: String(u), key: new Headers(init?.headers).get('X-Admin-Key'), body: init?.body ? JSON.parse(String(init.body)) : null })
      return String(u).endsWith('/clear') ? reply({ ok: true }) : reply({ sites: [SITE] })
    })
    expect(await fetchReview('https://api.x', 'k', fetcher as typeof fetch)).toEqual([SITE])
    await clearReview('https://api.x', 'k', SITE.ref, fetcher as typeof fetch)
    expect(seen).toEqual([
      { url: 'https://api.x/v1/admin/review', key: 'k', body: null },
      { url: 'https://api.x/v1/admin/review/clear', key: 'k', body: { ref: SITE.ref } },
    ])
    const refused = (async () => reply({ error: 'not_allowed', message: 'That admin key is not right.' }, 403)) as typeof fetch
    await expect(fetchReview('https://api.x', 'bad', refused)).rejects.toMatchObject({ status: 403, message: 'That admin key is not right.' })
  })
})

describe('Sites to review', () => {
  it('lists flagged sites in a table and marks one reviewed', async () => {
    const calls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (u: RequestInfo | URL) => {
      calls.push(String(u))
      return String(u).endsWith('/clear') ? reply({ ok: true }) : reply({ sites: [SITE, OTHER] })
    }))
    render(<ReviewPanel base="https://api.x" adminKey="k" refresh={1} onRefused={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Sites to review' })).toBeTruthy()
    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(3)
    expect(within(rows[1]).getByRole('rowheader').textContent).toContain("Joe's Bank")
    expect(rows[1].textContent).toContain('bank, password')
    expect(rows[1].textContent).toContain('Paid')
    expect(within(rows[2]).getByRole('rowheader').textContent).toContain('Site BBBBBBBB')
    expect(rows[2].textContent).toContain('Not paid yet')

    fireEvent.click(screen.getByRole('button', { name: "Mark reviewed: Joe's Bank" }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe("Joe's Bank marked reviewed."))
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2)
    expect(calls).toEqual(['https://api.x/v1/admin/review', 'https://api.x/v1/admin/review/clear'])
  })

  it('says when there is nothing to review, and hands a refused key back', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply({ sites: [] })))
    render(<ReviewPanel base="https://api.x" adminKey="k" refresh={1} onRefused={vi.fn()} />)
    expect(await screen.findByText('Nothing to review.')).toBeTruthy()
    cleanup()
    vi.stubGlobal('fetch', vi.fn(async () => reply({ error: 'not_allowed', message: 'That admin key is not right.' }, 403)))
    const onRefused = vi.fn()
    render(<ReviewPanel base="https://api.x" adminKey="bad" refresh={1} onRefused={onRefused} />)
    await waitFor(() => expect(onRefused).toHaveBeenCalledWith('That admin key is not right.'))
  })
})
