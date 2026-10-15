import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { BASE, BUILDER, client } from './client'
import { startStack } from './stack'
import type { Stack } from './stack'

/** "My business isn't listed" under Miniflare: what's counted, what never is, and the dashboard's view. */

const ADMIN = 'requested-admin-key-0123456789abcdef'

let s: Stack
let c: ReturnType<typeof client>
beforeAll(async () => {
  s = await startStack({ baseDomain: BASE, adminToken: ADMIN })
  c = client(s)
}, 60_000)
afterAll(() => s?.close(), 60_000)

type Row = Record<string, unknown>
const d1 = async () => (await s.db()) as unknown as D1Database
const rows = async (sql: string, ...values: unknown[]): Promise<Row[]> => (await (await d1()).prepare(sql).bind(...values).all<Row>()).results

/** Written after the response: waits until the row has the expected count. */
async function countOf(text: string, want: number): Promise<Row> {
  for (let i = 0; i < 60; i++) {
    const [row] = await rows('SELECT * FROM requested_types WHERE text = ?1', text)
    if (row && Number(row.count) >= want) return row
    await new Promise(r => setTimeout(r, 50))
  }
  throw new Error(`Expected ${text} ×${want}`)
}

const ask = (body: unknown, headers: Record<string, string> = {}) =>
  s.fetch(`https://api.${BASE}/v1/requested-types`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8', Origin: BUILDER, 'CF-Connecting-IP': '203.0.113.9', ...headers },
    body: JSON.stringify(body),
  })

describe('requested business types', () => {
  it('counts each description, cleaned, with the type we suggested', async () => {
    expect((await ask({ text: '  Window   Cleaner ', closest: 'landscaper' })).status).toBe(204)
    expect((await ask({ text: 'window cleaner' })).status).toBe(204)
    const row = await countOf('window cleaner', 2)
    expect(row).toMatchObject({ count: 2, closest: null })
    expect(Object.keys(row).sort()).toEqual(['closest', 'count', 'first_at', 'last_at', 'text'])
  })

  it('never keeps contact details or anything that isn\'t a short description', async () => {
    for (const text of ['ring me 07700 900123', 'jo@example.com', 'www.example.co.uk', 'x']) {
      expect((await ask({ text })).status).toBe(204)
    }
    await new Promise(r => setTimeout(r, 200))
    const all = (await rows('SELECT text FROM requested_types')).map(r => String(r.text))
    expect(all.some(t => /\d|@|www/.test(t))).toBe(false)
  })

  it('refuses extra fields and unknown types', async () => {
    expect((await ask({ text: 'florist', name: 'Jo' })).status).toBe(422)
    expect((await ask({ text: 'florist', closest: 'astronaut' })).status).toBe(422)
    expect((await ask('florist')).status).toBe(422)
    expect((await ask({ text: 'florist' }, { 'Content-Type': 'application/x-www-form-urlencoded' })).status).toBe(415)
  })

  it('shows on the dashboard, most asked first, for the admin only', async () => {
    for (let i = 0; i < 3; i++) await ask({ text: 'dog groomer' })
    await countOf('dog groomer', 3)
    const q = new URLSearchParams({ from: '0', to: String(Date.now() + 60_000) })
    expect((await c.call(`/v1/admin/stats?${q}`)).status).toBe(401)
    const stats = (await (await c.call(`/v1/admin/stats?${q}`, { admin: ADMIN })).json()) as { requested: { text: string; count: number }[] }
    expect(stats.requested[0]).toMatchObject({ text: 'dog groomer', count: 3 })
    expect(stats.requested.map(r => r.text)).toContain('window cleaner')
  })
})
