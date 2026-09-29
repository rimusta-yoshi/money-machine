import type { SectionConfig, TradeConfig } from '../types'
import type { Site, SiteContent } from '../site/schema'

export interface LayoutState {
  index: number
  count: number
  label: string
  /** A generated section is still working out its options. */
  loading: boolean
  /** When the content doesn't allow any layout yet: what to add. */
  needs?: string
}

/** What the desktop panel and the phone sheet both need to drive the builder. */
export interface SectionNavProps {
  site: Site
  trade: TradeConfig
  sections: SectionConfig[]
  activeIdx: number
  /** The layout currently shown for the active section, among its options. */
  layout: LayoutState
  doneCount: number
  allDone: boolean
  onCycleLayout: (dir: 1 | -1) => void
  /** Re-rolls a generated section's options. Absent for template sections. */
  onNewOptions?: () => void
  onNext: () => void
  onFinish: () => void
  onContentChange: (patch: Partial<SiteContent>) => void
}
