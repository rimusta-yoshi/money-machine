/**
 * The phone builder, one section at a time: swipe layouts in a slim bar ("pick"), then
 * optionally open just that section's fields ("edit"). Done and Next both move on; tapping
 * another section goes back to its bar, never straight into its fields.
 */
export type PhoneMode = 'pick' | 'edit'

/** The edit screen's preview: the phone layout, or the desktop one scaled down. */
export type PreviewSize = 'phone' | 'computer'

export interface PhoneFlow {
  mode: PhoneMode
  size: PreviewSize
}

export type PhoneFlowAction =
  | { type: 'edit' }
  /** Back to the bar (Escape, or Done just before moving on). */
  | { type: 'close' }
  /** Moved to another section (Next, Done, or a tap on the site): always its bar. */
  | { type: 'moved' }
  | { type: 'size'; size: PreviewSize }

export const PHONE_FLOW_START: PhoneFlow = { mode: 'pick', size: 'phone' }

export function phoneFlow(state: PhoneFlow, action: PhoneFlowAction): PhoneFlow {
  switch (action.type) {
    case 'edit':
      return { ...state, mode: 'edit' }
    case 'close':
    case 'moved':
      return state.mode === 'pick' && state.size === 'phone' ? state : { mode: 'pick', size: 'phone' }
    case 'size':
      return state.mode === 'edit' ? { ...state, size: action.size } : state
  }
}

/** "Hero · Photo on top · 1 of 6 · swipe to change", or what to say when there's nothing to swipe. */
export function barLine(section: string, layout: { label: string; index: number; count: number; loading: boolean }): string {
  if (layout.loading && layout.count === 0) return `${section} · making layouts…`
  if (layout.count > 1) return `${section} · ${layout.label} · ${layout.index + 1} of ${layout.count} · swipe to change`
  if (layout.count === 1) return `${section} · ${layout.label} · the one layout that fits`
  return `${section} · no layouts fit this content yet`
}

/** How tall the preview above the fields is: most of the screen, but never squeezing the fields out. */
export function previewHeight(viewportHeight: number): number {
  return Math.round(Math.min(380, Math.max(150, viewportHeight * 0.42)))
}
