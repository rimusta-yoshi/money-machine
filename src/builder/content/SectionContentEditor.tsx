import { useId } from 'react'
import type { SectionType, TradeConfig } from '../../types'
import type { Site, SiteContent } from '../../site/schema'
import { sectionChecklist } from '../../site/checklist'
import type { ChecklistItem } from '../../site/checklist'
import { Icon } from '../../components/ui/Icon'
import { ChecklistItemEditor } from './ChecklistItemEditor'
import './content.css'

interface Props {
  site: Site
  trade: TradeConfig
  section: SectionType
  onContentChange: (patch: Partial<SiteContent>) => void
}

/** The content fields for one section, shown beside it while it's being built. */
export function SectionContentEditor({ site, trade, section, onContentChange }: Props) {
  const items = sectionChecklist(site, trade, section)
  if (items.length === 0) {
    return <p className="mm-note">Nothing to fill in here. This section uses your trade and business details.</p>
  }
  return (
    <div className="mm-section-content">
      {items.map(item => (
        <ContentItem key={item.id} item={item} site={site} trade={trade} onContentChange={onContentChange} />
      ))}
      {items.some(i => !i.done) && (
        <p className="mm-note">Skip anything you like. It stays hidden on your live site, never made up.</p>
      )}
    </div>
  )
}

interface ItemProps {
  item: ChecklistItem
  site: Site
  trade: TradeConfig
  onContentChange: (patch: Partial<SiteContent>) => void
}

function ContentItem({ item, site, trade, onContentChange }: ItemProps) {
  const labelId = useId()
  return (
    <div className="mm-content-item" role="group" aria-labelledby={labelId}>
      <p id={labelId} className="mm-content-label">
        {item.label}
        {item.done && <span className="mm-content-done"><Icon.Check size={12} /> Added</span>}
      </p>
      <ChecklistItemEditor id={item.id} site={site} trade={trade} onContentChange={onContentChange} />
    </div>
  )
}
