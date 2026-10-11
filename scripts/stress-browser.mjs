// The builder stress test in a real browser: every trade × theme × content shape × seed, each
// section generated exactly as the builder does (real DOM measurer, real fonts). Fails if any
// section offers fewer than three options, throws, or shows an option that fails a hard check.
//
//   npm run stress                                   the full matrix (50 seeds)
//   npm run stress -- --seeds 5 --query "trade=landscaper&theme=workwear"
//   npm run stress -- --pages 4 --shard 0/2           CI: this machine's share, four tabs at once
//   npm run stress -- --out stress-report.json
//
// Exits non-zero on any failure, and lists the worst offenders.
import { writeFileSync } from 'node:fs'
import { launchBrowser, startSheetServer } from './browser.mjs'

const args = process.argv.slice(2)
const arg = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback }
const seeds = Number(arg('--seeds', '50'))
const pages = Number(arg('--pages', '4'))
const [shard, shards] = arg('--shard', '0/1').split('/').map(Number)
const extra = arg('--query', '')
const out = arg('--out')

const { url, close: closeServer } = await startSheetServer()
const browser = await launchBrowser()
const started = Date.now()
try {
  const tabs = pages * shards
  const runs = await Promise.all(Array.from({ length: pages }, async (_, i) => {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
    page.on('pageerror', err => console.error('page error:', err.message))
    const part = shard * pages + i
    await page.goto(`${url}sheet.html?mode=stress&seeds=${seeds}&shard=${part}&of=${tabs}&${extra}`)
    let last = ''
    await page.waitForFunction(() => window.__stress?.done, undefined, { timeout: 6 * 60 * 60_000, polling: 5000 }).catch(e => { throw e })
    const state = await page.evaluate(() => window.__stress)
    if (state.progress !== last) last = state.progress
    await page.close()
    return state
  }))
  const failures = runs.flatMap(r => r.failures)
  const errors = runs.flatMap(r => r.errors)
  const cases = runs.reduce((n, r) => n + r.cases, 0)
  const sections = runs.reduce((n, r) => n + r.sections, 0)
  const slowest = runs.flatMap(r => r.slowest).sort((a, b) => b.ms - a.ms).slice(0, 5)
  const tiers = {}
  for (const r of runs) for (const [k, n] of Object.entries(r.tiers)) tiers[k] = (tiers[k] ?? 0) + n

  // Worst offenders: which section/theme/shape fails most, and why.
  const groups = new Map()
  for (const f of failures) {
    const key = `${f.section} · ${f.theme} · ${f.shape}`
    const g = groups.get(key) ?? { key, count: 0, reasons: {}, example: f }
    g.count++
    for (const [id, n] of Object.entries(f.rejected)) g.reasons[id] = (g.reasons[id] ?? 0) + n
    if (f.error) g.reasons[f.error.split('\n')[0]] = (g.reasons[f.error.split('\n')[0]] ?? 0) + 1
    groups.set(key, g)
  }
  const worst = [...groups.values()].sort((a, b) => b.count - a.count)
  for (const g of worst.slice(0, 25)) {
    const why = Object.entries(g.reasons).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id, n]) => `${id} ×${n}`).join(', ')
    const e = g.example
    console.log(`${String(g.count).padStart(4)}  ${g.key}  (e.g. ${e.trade} seed ${e.seed}: ${e.shown} shown)  ${why}`)
  }
  const rejects = {}
  for (const r of runs) for (const [k, v] of Object.entries(r.rejects)) {
    rejects[k] ??= { n: 0, example: v.example }
    rejects[k].n += v.n
  }
  if (args.includes('--rejects')) {
    console.log('\nRejected candidates by section/layout/check:')
    for (const [k, v] of Object.entries(rejects).sort((a, b) => b[1].n - a[1].n).slice(0, 60)) console.log(`${String(v.n).padStart(6)}  ${k}  e.g. ${v.example.slice(0, 160)}`)
  }
  if (errors.length) console.error(errors.join('\n'))
  const mins = ((Date.now() - started) / 60_000).toFixed(1)
  console.log(`\nStress: ${cases} cases, ${sections} sections generated in ${mins} min; ${failures.length} failing.`)
  console.log(`Options shown by tier: ${Object.entries(tiers).map(([k, n]) => `${k} ${n}`).join(', ')}`)
  console.log(`Slowest: ${slowest.map(s => `${s.where} ${s.ms}ms`).join('; ')}`)
  if (out) writeFileSync(out, JSON.stringify({ cases, sections, failures, worst, tiers, rejects }, null, 2))
  if (failures.length || errors.length) process.exitCode = 1
} finally {
  await browser.close()
  await closeServer()
}
