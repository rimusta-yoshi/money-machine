import { useId, useMemo } from 'react'
import type { TradeConfig } from '../../types'
import type { Site } from '../../site/schema'
import { pickedSuggestion, suggestHeadlines } from '../../site/headlines'
import { LIMITS } from '../../site/limits'
import { TextField } from '../ui/TextField'

interface Props {
  site: Site
  trade: TradeConfig
  onChange: (headline: string | null) => void
}

/**
 * The hero's headline: three suggestions for this site (with the trade and town) or the
 * customer's own words. The page title and search listing stay as the basics make them.
 */
export function HeadlinePicker({ site, trade, onChange }: Props) {
  const legendId = useId()
  const suggestions = useMemo(() => suggestHeadlines(site, trade), [site, trade])
  const headline = site.content.headline ?? null
  const picked = pickedSuggestion(headline, suggestions)
  const own = headline && picked < 0 ? headline : ''

  return (
    <div className="mm-headline" data-preview="[data-heading]">
      <div role="group" aria-labelledby={legendId} className="mm-headline-list">
        <p id={legendId} className="mm-content-label">Pick a headline</p>
        {suggestions.map((s, i) => (
          <button
            key={s}
            type="button"
            className={`mm-headline-opt${i === picked ? ' on' : ''}`}
            aria-pressed={i === picked}
            onClick={() => onChange(i === picked ? null : s)}
          >
            {s}
          </button>
        ))}
      </div>
      <TextField
        label="Or write your own"
        value={own}
        count={LIMITS.headline}
        placeholder={trade.tagline}
        enterKeyHint="done"
        onValue={v => onChange(v.trim() ? v : null)}
      />
    </div>
  )
}
