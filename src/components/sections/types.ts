import type { BusinessInfo, TradeConfig } from '../../types'
import type { RenderMode, ResolvedContent } from '../../site/resolve'

/** Props every section template receives. */
export interface SectionProps {
  business: BusinessInfo
  trade: TradeConfig
  content: ResolvedContent
  mode: RenderMode
}
