import { useEffect, useState } from 'react'

export interface ViewportBox {
  /** The visible height: shrinks when the on-screen keyboard opens. */
  height: number
  /** How far the visible area is scrolled down the page (iOS moves it when the keyboard opens). */
  top: number
}

const read = (): ViewportBox => {
  if (typeof window === 'undefined') return { height: 800, top: 0 }
  const vv = window.visualViewport
  return vv ? { height: vv.height, top: vv.offsetTop } : { height: window.innerHeight, top: 0 }
}

/**
 * The part of the page actually on screen, following the on-screen keyboard (visualViewport),
 * so fixed panels can sit inside it rather than behind the keyboard. Only listens while `on`.
 */
export function useVisualViewport(on: boolean): ViewportBox {
  const [box, setBox] = useState(read)
  useEffect(() => {
    if (!on) return
    const vv = window.visualViewport
    const update = () => setBox(prev => {
      const next = read()
      return Math.abs(prev.height - next.height) < 1 && Math.abs(prev.top - next.top) < 1 ? prev : next
    })
    update()
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [on])
  return box
}
