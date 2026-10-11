import { useEffect, useState } from 'react'
import { AdminError, fetchStats } from './adminApi'
import type { StatsQuery } from './adminApi'
import { Filters } from './Filters'
import type { FilterState } from './Filters'
import { customRange, isoDay, presetRange, tzOffset } from './range'
import type { Stats } from './types'
import { FunnelPanel } from './panels/FunnelPanel'
import { MoneyPanel } from './panels/MoneyPanel'
import { DailyPanel } from './panels/DailyPanel'
import { BreakdownPanel } from './panels/BreakdownPanel'
import { RecentSitesPanel } from './panels/RecentSitesPanel'
import { LayoutPicksPanel } from './panels/LayoutPicksPanel'

interface Props {
  base: string
  adminKey: string
  /** The key was refused: ask for it again with this message. */
  onRefused: (message: string) => void
}

type Result = { query: StatsQuery; stats: Stats } | { query: StatsQuery; error: string }

/** The query for these filters, with "now" taken at the moment they're applied. Null if the custom dates don't make a range. */
function queryFor(f: FilterState): StatsQuery | null {
  const now = Date.now()
  const range = f.preset === 'custom' ? customRange(f.customFrom, f.customTo) : presetRange(f.preset, now)
  return range && { ...range, src: f.src, tz: tzOffset(range.to) }
}

const START: FilterState = { preset: '30d', customFrom: isoDay(presetRange('7d', Date.now()).from), customTo: isoDay(Date.now()), src: '' }

export function Dashboard({ base, adminKey, onRefused }: Props) {
  const [filters, setFilters] = useState<FilterState>(START)
  const [query, setQuery] = useState<StatsQuery | null>(() => queryFor(START))
  const [result, setResult] = useState<Result | null>(null)
  const apply = (next: FilterState) => {
    setFilters(next)
    setQuery(queryFor(next))
  }

  useEffect(() => {
    if (!query) return
    let live = true
    fetchStats(base, adminKey, query).then(
      stats => { if (live) setResult({ query, stats }) },
      err => {
        if (!live) return
        if (err instanceof AdminError && (err.status === 401 || err.status === 403)) onRefused(err.message)
        else setResult({ query, error: err instanceof Error ? err.message : 'The numbers could not be loaded.' })
      },
    )
    return () => { live = false }
  }, [base, adminKey, query, onRefused])

  const loading = !!query && result?.query !== query
  // The last numbers stay up while new ones load, so the page doesn't jump.
  const stats = result && 'stats' in result ? result.stats : null
  return (
    <main className="ad-main" aria-busy={loading}>
      <h1 className="ad-h1">How people get to paying</h1>
      <Filters value={filters} onChange={apply} sources={stats?.sources ?? []} invalid={!query} onRefresh={() => apply({ ...filters })} />
      <p role="status" className="ad-note ad-status-line">{loading ? 'Loading the numbers…' : ''}</p>
      {result && 'error' in result && !loading && <p className="bf-error" role="alert">{result.error}</p>}
      {stats && (
        <div className="ad-grid">
          <FunnelPanel rows={stats.funnel} afterPaying={stats.afterPaying} />
          <MoneyPanel money={stats.money} />
          <DailyPanel daily={stats.daily} range={stats.range} />
          <BreakdownPanel breakdowns={stats.breakdowns} />
          <RecentSitesPanel sites={stats.recent} />
          <LayoutPicksPanel layouts={stats.layouts} />
        </div>
      )}
    </main>
  )
}
