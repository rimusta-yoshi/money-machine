import { useId } from 'react'

/** Starting colours: a van or logo colour is usually close to one of these. */
const SWATCHES: readonly { name: string; hex: string }[] = [
  { name: 'Blue', hex: '#1F4FD8' },
  { name: 'Teal', hex: '#0F766E' },
  { name: 'Red', hex: '#D93A1F' },
  { name: 'Yellow', hex: '#FFD400' },
  { name: 'Purple', hex: '#6D28D9' },
  { name: 'Black', hex: '#1C1A24' },
]

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

interface Props {
  color: string
  onChange: (color: string) => void
  /** The site style adjusted the colour for readability somewhere (text shades, button edges). */
  tuned: boolean
}

/** Colour swatches as real radios, plus Custom (the browser's colour picker) for an exact van colour. */
export function ColourPicker({ color, onChange, tuned }: Props) {
  const name = useId()
  const labelId = useId()
  const custom = !SWATCHES.some(s => same(s.hex, color))
  return (
    <div className="bl-group">
      <p id={labelId} className="bl-label">Your colour <span>· your van, your logo</span></p>
      <div role="radiogroup" aria-labelledby={labelId} className="bl-swatches">
        {SWATCHES.map(s => (
          <label key={s.hex} className={`bl-swatch${same(s.hex, color) ? ' on' : ''}`} style={{ background: s.hex }}>
            <input type="radio" name={name} value={s.hex} className="sb-sr-only" checked={same(s.hex, color)} onChange={() => onChange(s.hex)} />
            <span className="sb-sr-only">{s.name}</span>
          </label>
        ))}
        <label className={`bl-custom${custom ? ' on' : ''}`}>
          {custom && <span className="bl-custom-dot" style={{ background: color }} aria-hidden="true" />}
          Custom
          <input type="color" className="sb-sr-only" value={color} onChange={e => onChange(e.target.value)} aria-describedby={`${labelId}-hex`} />
        </label>
      </div>
      <p id={`${labelId}-hex`} className="sb-sr-only">Current colour {color.toUpperCase()}</p>
      <p className="bl-tuned" role="status">{tuned ? 'We’ve tuned your colour slightly so text stays easy to read.' : ''}</p>
    </div>
  )
}
