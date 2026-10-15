/** How far one arrow-key press moves the focal point, in percent. */
const STEP = 5
export const CENTRE = { x: 50, y: 50 }

const clamp = (n: number) => Math.round(Math.max(0, Math.min(100, n)))

/** Where a tap landed on the photo, in percent from its top left. */
export function focusFromTap(rect: { left: number; top: number; width: number; height: number }, x: number, y: number): { x: number; y: number } {
  if (rect.width <= 0 || rect.height <= 0) return CENTRE
  return { x: clamp(((x - rect.left) / rect.width) * 100), y: clamp(((y - rect.top) / rect.height) * 100) }
}

/** The point after an arrow key, or null for any other key. */
export function focusFromKey(focus: { x: number; y: number }, key: string): { x: number; y: number } | null {
  const move: Record<string, [number, number]> = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] }
  const d = move[key]
  return d ? { x: clamp(focus.x + d[0]), y: clamp(focus.y + d[1]) } : null
}
