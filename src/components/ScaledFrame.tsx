import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

interface Props {
  /** The width the content is laid out at, e.g. 1200 for a desktop page or 390 for a phone. */
  width: number
  children: ReactNode
  className?: string
  /** Keep the box's own (CSS) height and crop the content, instead of growing to fit it. */
  crop?: boolean
}

/**
 * Lays its content out at a fixed width and scales it to fit the box, like a screenshot
 * that stays live. Generated sections respond to their container's width, so a 390px
 * frame shows the phone layout whatever the screen.
 */
export function ScaledFrame({ width, children, className, crop = false }: Props) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    const o = outer.current
    const i = inner.current
    if (!o || !i) return
    const compute = () => {
      setScale(o.clientWidth / width)
      setHeight(i.scrollHeight)
    }
    compute()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(compute)
    ro.observe(o)
    ro.observe(i)
    return () => ro.disconnect()
  }, [width])

  return (
    <div ref={outer} className={className} style={{ position: 'relative', overflow: 'hidden', height: crop || !scale ? undefined : Math.ceil(height * scale) }}>
      <div ref={inner} style={{ width, transform: `scale(${scale || 1})`, transformOrigin: 'top left', visibility: scale ? undefined : 'hidden' }}>
        {children}
      </div>
    </div>
  )
}
