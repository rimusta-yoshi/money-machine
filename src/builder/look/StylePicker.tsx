import { useId } from 'react'
import { THEME_KEYS, THEMES } from '../../gen'
import type { ThemeKey } from '../../gen'

/** Short, plain descriptions for the four styles. */
const HINTS: Record<ThemeKey, string> = {
  workwear: 'Bold and loud',
  'clean-pro': 'Calm and crisp',
  'friendly-local': 'Warm and chatty',
  'craft-heritage': 'Quiet and careful',
}

interface Props {
  theme: ThemeKey
  onTheme: (theme: ThemeKey) => void
  /** Same style, a fresh roll of ground, type, buttons and corners. */
  onShuffle: () => void
}

/** The four site styles as cards (real radios), each showing its own type, and a shuffle. */
export function StylePicker({ theme, onTheme, onShuffle }: Props) {
  const name = useId()
  return (
    <fieldset className="bl-group bl-styles">
      <legend className="bl-label">Your style</legend>
      <div className="bl-style-grid">
        {THEME_KEYS.map(key => {
          const t = THEMES[key]
          const g = t.grounds[0]
          return (
            <label key={key} className={`bl-style${key === theme ? ' on' : ''}`}>
              <input type="radio" name={name} value={key} className="sb-sr-only" checked={key === theme} onChange={() => onTheme(key)} />
              <span className="bl-style-aa" aria-hidden="true" style={{ background: g.ground, color: g.ink, fontFamily: `'${t.fonts.display.family}'` }}>Aa</span>
              <span className="bl-style-name">{t.label}</span>
              <span className="bl-style-hint">{HINTS[key]}</span>
            </label>
          )
        })}
      </div>
      <button type="button" className="sb-link-btn bl-shuffle" onClick={onShuffle}>Shuffle this style</button>
    </fieldset>
  )
}
