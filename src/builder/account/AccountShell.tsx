import type { ReactNode } from 'react'
import { Logo } from '../../brand/Logo'
import './account.css'

interface Props {
  /** The page's one heading. */
  title: string
  children: ReactNode
}

/** One-screen pages around paying: the logo bar, then a single card with one main button at most. */
export function AccountShell({ title, children }: Props) {
  return (
    <div className="bt-root sb-ui ba-root">
      <header className="bt-bar"><Logo href="/" /></header>
      <main className="ba-main">
        <section className="ba-card" aria-labelledby="ba-h">
          <h1 id="ba-h" className="bs-h1">{title}</h1>
          {children}
        </section>
      </main>
    </div>
  )
}
