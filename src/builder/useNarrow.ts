import { useEffect, useState } from 'react'

/** Below this width the builder uses its phone layouts. */
export const NARROW_PX = 768

const isNarrow = () => typeof window !== 'undefined' && window.innerWidth < NARROW_PX

/** Whether the screen is phone-sized, following resizes and rotation. */
export function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(isNarrow)
  useEffect(() => {
    const onResize = () => setNarrow(isNarrow())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return narrow
}
