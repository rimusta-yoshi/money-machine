import type { ReactNode } from 'react'
import { Logo } from '../../brand/Logo'
import { STEPS, stepIndex } from '../steps'
import type { Step } from '../steps'

interface Props {
  step: Step
  /** Opens an earlier step. */
  onGoStep: (step: Step) => void
  /** Right-hand slot: save status, or the preview size switch while building. */
  right?: ReactNode
}

const BLOCK: Record<Step, string> = { basics: 'brick', look: 'yellow', build: 'blue', finish: 'brick' }

/** Logo, the four steps (done ones in lawn, the current one in night) and a status slot. */
export function TopBar({ step, onGoStep, right }: Props) {
  const current = stepIndex(step)
  return (
    <header className="bt-bar">
      <Logo href="/" />
      <nav aria-label="Steps" className="bt-steps-nav">
        <ol className="bt-steps">
          {STEPS.map((s, i) => {
            const state = i === current ? 'now' : i < current ? 'done' : 'todo'
            const block = state === 'now' ? BLOCK[s.id] : state
            const label = <><span className={`bt-step-block bt-step-block--${block}`} aria-hidden="true" />{s.label}</>
            return (
              <li key={s.id} className={`bt-step bt-step--${state}`} aria-current={state === 'now' ? 'step' : undefined}>
                {state === 'done'
                  ? <button type="button" className="bt-step-btn" onClick={() => onGoStep(s.id)}>{label}<span className="sb-sr-only"> (done)</span></button>
                  : <span className="bt-step-btn">{label}</span>}
              </li>
            )
          })}
        </ol>
      </nav>
      <div className="bt-right">{right}</div>
    </header>
  )
}
