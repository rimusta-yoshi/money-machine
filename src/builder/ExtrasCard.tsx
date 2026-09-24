import type { ExtraId } from '../site/schema'
import { Icon } from '../components/ui/Icon'

interface ExtraOption {
  id: ExtraId
  title: string
  description: string
}

const OPTIONS: ExtraOption[] = [
  {
    id: 'reviews',
    title: 'Customer reviews',
    description: 'Show your star rating and real reviews from your customers. You add them before going live.',
  },
]

interface Props {
  extras: ExtraId[]
  onToggle: (extra: ExtraId) => void
}

export function ExtrasCard({ extras, onToggle }: Props) {
  return (
    <fieldset className="mm-extras-card">
      <legend className="mm-extras-label">Extras</legend>
      <div className="mm-extras-body">
        {OPTIONS.map(opt => {
          const on = extras.includes(opt.id)
          return (
            <label key={opt.id} className={`mm-extra${on ? ' on' : ''}`}>
              <input
                type="checkbox"
                className="mm-extra-input"
                checked={on}
                onChange={() => onToggle(opt.id)}
              />
              <span className="mm-extra-box" aria-hidden="true">
                {on && <Icon.Check size={12} />}
              </span>
              <span className="mm-extra-text">
                <b>{opt.title}</b>
                <small>{opt.description}</small>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
