import { PRESETS } from './range'
import type { Preset } from './range'
import { DIRECT } from './types'

export interface FilterState {
  preset: Preset
  /** yyyy-mm-dd, used when preset is custom. */
  customFrom: string
  customTo: string
  /** '' every source, '(direct)' none, else one source. */
  src: string
}

interface Props {
  value: FilterState
  onChange: (next: FilterState) => void
  sources: string[]
  /** The custom dates are the wrong way round or missing. */
  invalid: boolean
  onRefresh: () => void
}

/** One row above everything: the date range and the ad source. */
export function Filters({ value, onChange, sources, invalid, onRefresh }: Props) {
  const set = (patch: Partial<FilterState>) => onChange({ ...value, ...patch })
  // The chosen source stays in the list even if the new range has no events from it.
  const options = value.src && value.src !== DIRECT && !sources.includes(value.src) ? [value.src, ...sources] : sources
  return (
    <div className="ad-filters">
      <div role="group" aria-label="Date range" className="ad-seg">
        {PRESETS.map(p => (
          <button key={p.id} type="button" aria-pressed={value.preset === p.id} onClick={() => set({ preset: p.id })}>{p.label}</button>
        ))}
      </div>
      {value.preset === 'custom' && (
        <div className="ad-custom">
          <label className="ad-inline">From <input type="date" className="bf-input ad-date" value={value.customFrom} onChange={e => set({ customFrom: e.target.value })} aria-invalid={invalid || undefined} aria-describedby={invalid ? 'ad-range-err' : undefined} /></label>
          <label className="ad-inline">To <input type="date" className="bf-input ad-date" value={value.customTo} onChange={e => set({ customTo: e.target.value })} aria-invalid={invalid || undefined} aria-describedby={invalid ? 'ad-range-err' : undefined} /></label>
          {invalid && <p id="ad-range-err" className="bf-error">Choose a start date on or before the end date.</p>}
        </div>
      )}
      <label className="ad-inline">
        Ad source
        <select className="bf-input ad-select" value={value.src} onChange={e => set({ src: e.target.value })}>
          <option value="">All sources</option>
          <option value={DIRECT}>Direct (no source)</option>
          {options.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <button type="button" className="sb-line-btn ad-refresh" onClick={onRefresh}>Refresh</button>
    </div>
  )
}
