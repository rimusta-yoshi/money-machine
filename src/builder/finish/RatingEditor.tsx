import { useId, useState } from 'react'

type Rating = { score: number; count: number }

interface Props {
  rating: Rating | null
  onChange: (rating: Rating | null) => void
}

const parse = (score: string, count: string): Rating | null => {
  const s = Number(score)
  const c = Number(count)
  const valid = score !== '' && count !== '' && s >= 1 && s <= 5 && Number.isInteger(c) && c >= 1
  return valid ? { score: Math.round(s * 10) / 10, count: c } : null
}

/** Overall star rating, e.g. from Google. Only saved once both numbers are valid. */
export function RatingEditor({ rating, onChange }: Props) {
  const id = useId()
  const [score, setScore] = useState(rating ? String(rating.score) : '')
  const [count, setCount] = useState(rating ? String(rating.count) : '')

  const update = (nextScore: string, nextCount: string) => {
    setScore(nextScore)
    setCount(nextCount)
    onChange(parse(nextScore, nextCount))
  }

  return (
    <div className="mm-fld-2">
      <div className="mm-fld">
        <label htmlFor={`${id}-s`}>Average stars</label>
        <input id={`${id}-s`} type="number" inputMode="decimal" min={1} max={5} step={0.1} placeholder="4.8" value={score} onChange={e => update(e.target.value, count)} />
      </div>
      <div className="mm-fld">
        <label htmlFor={`${id}-c`}>Number of reviews</label>
        <input id={`${id}-c`} type="number" inputMode="numeric" min={1} step={1} placeholder="27" value={count} onChange={e => update(score, e.target.value)} />
      </div>
    </div>
  )
}
