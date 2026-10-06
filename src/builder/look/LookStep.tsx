import type { PageContent, ThemeKey } from '../../gen'
import type { TradeConfig } from '../../types'
import type { Site } from '../../site/schema'
import { ColourPicker } from './ColourPicker'
import { LookPreview } from './LookPreview'
import { ReviewsSwitch } from './ReviewsSwitch'
import { StylePicker } from './StylePicker'
import './look.css'

interface Props {
  site: Site
  trade: TradeConfig
  content: PageContent
  onBrandColor: (color: string) => void
  onTheme: (theme: ThemeKey) => void
  onShuffle: () => void
  onToggleReviews: () => void
  onBack: () => void
  onNext: () => void
  /** Dev-only switch: fill the preview with sample content. Absent in production builds. */
  sample?: { on: boolean; set: (on: boolean) => void }
}

/** Step 2: colour, style and the reviews extra, with a big live preview of the top of the site. */
export function LookStep({ site, trade, content, onBrandColor, onTheme, onShuffle, onToggleReviews, onBack, onNext, sample }: Props) {
  return (
    <main className="bl">
      <LookPreview site={site} trade={trade} content={content} />
      <aside aria-labelledby="look-h" className="bl-side">
        <div className="bl-intro">
          <h1 id="look-h" className="bs-h1">Your look</h1>
          <p className="bs-lead">Pick a colour and a style. You'll choose layouts for each section next.</p>
        </div>
        <ColourPicker color={site.brandColor} onChange={onBrandColor} tuned={site.style.resolved.palette.tuned} />
        <StylePicker theme={site.style.theme} onTheme={onTheme} onShuffle={onShuffle} />
        <ReviewsSwitch on={site.extras.includes('reviews')} onToggle={onToggleReviews} />
        {import.meta.env.DEV && sample && (
          <label className="bl-dev">
            <input type="checkbox" checked={sample.on} onChange={e => sample.set(e.target.checked)} />
            Fill with sample content <span>(dev only; never saved)</span>
          </label>
        )}
        <div className="bs-foot">
          <button type="button" className="sb-text-btn" onClick={onBack}>← Basics</button>
          <button type="button" className="sb-main-btn bs-next" onClick={onNext}>Start building</button>
        </div>
      </aside>
    </main>
  )
}
