import { useRef } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '../components/ui/Icon'

const PRESETS = [
  '#1E88E5', // blue
  '#2563EB', // indigo
  '#0891B2', // teal
  '#3F8F4F', // green
  '#F59E0B', // amber
  '#EA580C', // orange
  '#C2410C', // burnt orange
  '#DC2626', // red
  '#7C3AED', // purple
  '#374151', // slate
]

interface Props {
  color: string
  onChange: (color: string) => void
  /** The site style adjusted the colour for readability somewhere (text shades, button edges). */
  tuned?: boolean
}

export function BrandColorCard({ color, onChange, tuned = false }: Props) {
  const colorInputRef = useRef<HTMLInputElement>(null)
  const isActive = (c: string) => color.toLowerCase() === c.toLowerCase()

  return (
    <div className="mm-color-card">
      <div className="mm-color-card-label">
        <span>Brand colour</span>
      </div>
      <div className="mm-color-card-body">
        <div className="mm-color-big">
          <div className="mm-color-swatch-lg" style={{ background: color } as CSSProperties} />
          <span className="mm-color-hex">{color.toUpperCase()}</span>
          <button
            type="button"
            className="mm-color-custom-btn"
            onClick={() => colorInputRef.current?.click()}
          >
            <Icon.Brush size={13} /> Custom
            <input
              ref={colorInputRef}
              type="color"
              value={color}
              onChange={e => onChange(e.target.value)}
              tabIndex={-1}
              aria-hidden="true"
            />
          </button>
        </div>
        <div className="mm-color-presets">
          {PRESETS.map(c => (
            <button
              key={c}
              type="button"
              className={`mm-color-preset${isActive(c) ? ' active' : ''}`}
              style={{ background: c, color: c } as CSSProperties}
              onClick={() => onChange(c)}
              aria-label={`Set brand colour to ${c}`}
              aria-pressed={isActive(c)}
            />
          ))}
        </div>
        <TunedNote tuned={tuned} />
      </div>
    </div>
  )
}

/** A reassuring note, no action needed: the colour is still used exactly for fills and shapes. */
export function TunedNote({ tuned }: { tuned: boolean }) {
  return (
    <p className="mm-tuned" role="status">
      {tuned ? 'We’ve tuned your colour slightly so text stays easy to read.' : ''}
    </p>
  )
}
