import type { SectionConfig, TradeConfig } from '../types'
import type { Site, SiteContent } from '../site/schema'

/** What the desktop panel and the phone sheet both need to drive the builder. */
export interface SectionNavProps {
  site: Site
  trade: TradeConfig
  sections: SectionConfig[]
  activeIdx: number
  /** Index of the layout currently shown for the active section. */
  layoutIdx: number
  doneCount: number
  allDone: boolean
  onCycleLayout: (dir: 1 | -1) => void
  onNext: () => void
  onFinish: () => void
  onContentChange: (patch: Partial<SiteContent>) => void
}
