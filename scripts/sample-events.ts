// Made-up dashboard numbers for a local run: 30 days of visits from a few ad sources, people
// dropping off along the way, some paying, a refund and a dispute, and layout picks.
//
//   npm run dev:stack -- --sample-events
//
// Only fills an empty events table, so it's safe to leave on. Local only: it writes to the dev
// stack's own database. Node-runnable as is (no app imports).
import type { Stack } from '../server/test/stack.ts'

const DAY = 24 * 60 * 60 * 1000
const STEPS = ['landed', 'started', 'basics_done', 'look_picked', 'build_done', 'checkout_started', 'paid'] as const
/** Share of people who make it from each step to the next, per source. */
const SOURCES: { src: string | null; campaign: string | null; perDay: number; keep: number[] }[] = [
  { src: 'fb', campaign: 'oct-test', perDay: 38, keep: [0.3, 0.75, 0.7, 0.55, 0.35, 0.6] },
  { src: 'google', campaign: 'plumbers', perDay: 22, keep: [0.42, 0.8, 0.75, 0.6, 0.45, 0.7] },
  { src: 'leaflet', campaign: null, perDay: 6, keep: [0.5, 0.85, 0.8, 0.65, 0.5, 0.75] },
  { src: null, campaign: null, perDay: 14, keep: [0.35, 0.8, 0.7, 0.6, 0.4, 0.65] },
]
const TRADES = ['plumber', 'electrician', 'roofer', 'painter', 'landscaper']
const THEMES = ['workwear', 'clean-pro', 'craft-heritage', 'friendly-local']

/** A small seeded random generator, so every run looks the same. */
function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type D1 = { prepare: (sql: string) => { bind: (...v: unknown[]) => unknown; first: () => Promise<{ n: number } | null> }; batch: (s: unknown[]) => Promise<unknown> }

/** Multi-row inserts (D1 allows 100 bound values per statement), far quicker than one row each. */
function manyRows(db: D1, into: string, rows: unknown[][]): unknown[] {
  if (!rows.length) return []
  const per = Math.floor(100 / rows[0].length)
  const out: unknown[] = []
  for (let i = 0; i < rows.length; i += per) {
    const chunk = rows.slice(i, i + per)
    const marks = chunk.map(r => `(${r.map(() => '?').join(', ')})`).join(', ')
    out.push(db.prepare(`INSERT INTO ${into} VALUES ${marks}`).bind(...chunk.flat()))
  }
  return out
}

export async function seedSampleEvents(stack: Stack, adminKey: string, base: string): Promise<string> {
  const db = (await stack.db()) as unknown as D1
  const existing = await db.prepare('SELECT COUNT(*) AS n FROM events').first()
  if ((existing?.n ?? 0) > 0) return 'Sample events: skipped (the events table already has data).'

  // The layout ids come from the server, so they always match the generator.
  const res = await stack.fetch(`https://api.${base}/v1/admin/stats?from=0&to=1`, { headers: { 'X-Admin-Key': adminKey } })
  const { layouts } = (await res.json()) as { layouts: { section: string; layouts: { id: string }[] }[] }

  const random = rng(42)
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(random() * xs.length)]
  const hex = () => Array.from({ length: 32 }, () => Math.floor(random() * 16).toString(16)).join('')
  const now = Date.now()
  const statements: unknown[] = []
  const events: unknown[][] = []
  const picks: unknown[][] = []
  const event = (step: string, at: number, s: (typeof SOURCES)[number], trade: string | null, theme: string | null, ref: string | null) =>
    events.push([step, at, trade, theme, s.src, s.campaign, ref])

  let paid = 0
  for (let d = 29; d >= 0; d--) {
    for (const s of SOURCES) {
      // Busier at weekends, and the ad gets going after the first week.
      const day = new Date(now - d * DAY)
      const weekend = day.getDay() === 0 || day.getDay() === 6 ? 1.3 : 1
      const ramp = s.src === 'fb' && d > 22 ? 0.3 : 1
      const people = Math.round(s.perDay * weekend * ramp * (0.7 + random() * 0.6))
      for (let p = 0; p < people; p++) {
        const at0 = now - d * DAY - Math.floor(random() * DAY * 0.9)
        if (at0 > now) continue
        const trade = pick(TRADES)
        const theme = pick(THEMES)
        let ref: string | null = null
        for (let i = 0; i < STEPS.length; i++) {
          if (i > 0 && random() > s.keep[i - 1]) break
          const step = STEPS[i]
          const at = Math.min(now, at0 + i * 4 * 60_000)
          if (step === 'build_done') ref = hex()
          event(step, at, s, i >= 2 ? trade : null, i >= 3 ? theme : null, ref)
          if (step === 'build_done' && random() < 0.25) event('preview_shared', at + 60_000, s, trade, theme, ref)
          if (step === 'look_picked') {
            for (const section of layouts) picks.push([at, section.section, section.layouts[Math.floor(random() ** 2 * section.layouts.length)].id, theme, trade, s.src])
          }
          if (step === 'build_done' || step === 'paid') {
            const record = JSON.stringify({ tradeId: trade, style: { theme } })
            if (step === 'build_done') {
              statements.push(db.prepare('INSERT INTO drafts (ref, key_hash, record, created_at, updated_at, seen_at, src, campaign) VALUES (?1, ?2, ?3, ?4, ?4, ?4, ?5, ?6)')
                .bind(ref, hex() + hex(), record, at, s.src, s.campaign))
            } else {
              paid++
              const refunded = paid % 9 === 0
              const disputed = paid === 5
              statements.push(db.prepare('UPDATE drafts SET paid_at = ?2, amount = 9900, currency = \'gbp\', published_at = ?2, slug = ?3, refunded_at = ?4, disputed_at = ?5 WHERE ref = ?1')
                .bind(ref, at, `sample-${paid}`, refunded ? at + DAY / 2 : null, disputed ? at + DAY : null))
              if (refunded) event('refunded', Math.min(now, at + DAY / 2), s, trade, theme, ref)
              if (disputed) event('disputed', Math.min(now, at + DAY), s, trade, theme, ref)
            }
          }
        }
      }
    }
  }
  statements.push(...manyRows(db, 'events (step, at, trade, theme, src, campaign, ref)', events), ...manyRows(db, 'layout_picks (at, section, layout, theme, trade, src)', picks))
  for (let i = 0; i < statements.length; i += 100) await db.batch(statements.slice(i, i + 100))
  return `Sample events: ${events.length} events and ${picks.length} layout picks written (${paid} sales). Open http://localhost:5173/admin/ with the admin key above.`
}
