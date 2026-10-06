import type { LayoutState } from '../sectionNav'

/** "Section 3 of 8". */
export const sectionCount = (activeIdx: number, total: number) => `Section ${activeIdx + 1} of ${total}`

/** What an empty carousel says instead of arrows. */
export function layoutNote(layout: LayoutState): string {
  if (layout.loading) return 'Making layouts…'
  return layout.count === 1 ? 'One layout for this section' : 'No layouts fit this content yet'
}
