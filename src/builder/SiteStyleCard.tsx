import { useId } from 'react'
import type { CSSProperties } from 'react'
import { THEME_KEYS, THEMES } from '../gen'
import type { ThemeKey } from '../gen'
import { TunedNote } from './BrandColorCard'

export interface SiteStyleControls {
  theme: ThemeKey
  onTheme: (theme: ThemeKey) => void
  /** A new style seed: same theme, a fresh roll of ground, type preset, buttons and corners. */
  onReroll: () => void
  /** Dev-only preview switch; absent in production builds. */
  sample?: { on: boolean; set: (on: boolean) => void }
  /** The brand colour was adjusted for readability in this theme. */
  tuned: boolean
}

/** Picks the site's theme, re-rolls its style, and (in development) previews with sample content. */
export function SiteStyleCard({ theme, onTheme, onReroll, sample, tuned }: SiteStyleControls) {
  const name = useId()
  return (
    <fieldset className="mm-style">
      <legend className="sc-eyebrow">Site style</legend>
      <div className="mm-style-themes">
        {THEME_KEYS.map(key => {
          const t = THEMES[key]
          const g = t.grounds[0]
          return (
            <label key={key} className={`mm-style-theme${key === theme ? ' on' : ''}`}>
              <input type="radio" name={name} value={key} checked={key === theme} onChange={() => onTheme(key)} />
              <span className="mm-style-swatch" aria-hidden="true" style={{ background: g.ground, color: g.ink, borderColor: g.line, fontFamily: `'${t.fonts.display.family}'` } as CSSProperties}>Aa</span>
              <span className="mm-style-text">
                <b>{t.label}</b>
                <span>{t.blurb}</span>
              </span>
            </label>
          )
        })}
      </div>
      <TunedNote tuned={tuned} />
      <button type="button" className="sc-reroll" onClick={onReroll}>Re-roll site style</button>
      {import.meta.env.DEV && sample && (
        <label className="mm-style-sample">
          <input type="checkbox" checked={sample.on} onChange={e => sample.set(e.target.checked)} />
          Fill with sample content <span>(dev only; nothing is saved while it’s on)</span>
        </label>
      )}
    </fieldset>
  )
}
