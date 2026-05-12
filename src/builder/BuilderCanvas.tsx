import { useState } from 'react'
import type { BusinessInfo, SectionType, TradeConfig } from '../types'
import { SectionSlot } from './SectionSlot'
import { Button } from '../components/ui/Button'

interface Props {
  trade: TradeConfig
  business: BusinessInfo
  onReset: () => void
}

function defaultSelections(trade: TradeConfig): Record<SectionType, string> {
  return Object.fromEntries(
    trade.sections.map(s => [s.type, s.recommended])
  ) as Record<SectionType, string>
}

export function BuilderCanvas({ trade, business, onReset }: Props) {
  const [selections, setSelections] = useState<Record<SectionType, string>>(() => defaultSelections(trade))

  const select = (type: SectionType, variantId: string) =>
    setSelections(prev => ({ ...prev, [type]: variantId }))

  const allSelected = trade.sections.every(s => selections[s.type])

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <button onClick={onReset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.9rem', padding: 0, marginBottom: '8px' }}>
            ← Start over
          </button>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {trade.emoji} Build your {trade.name} site
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            {trade.sections.filter(s => selections[s.type]).length} / {trade.sections.length} sections
          </span>
        </div>
      </div>
      <p style={{ color: '#64748b', marginBottom: '36px' }}>
        Swipe through each section to pick the layout you like. Selected sections stack to form your site.
      </p>

      {/* Section slots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {trade.sections.map((section, i) => (
          <SectionSlot
            key={section.type}
            section={section}
            trade={trade}
            business={business}
            selectedVariantId={selections[section.type]}
            onSelect={(id) => select(section.type, id)}
            slotIndex={i}
          />
        ))}
      </div>

      {/* Done CTA */}
      {allSelected && (
        <div style={{
          marginTop: '40px',
          padding: '32px',
          backgroundColor: `${trade.colorScheme.primary}08`,
          border: `2px solid ${trade.colorScheme.primary}`,
          borderRadius: '14px',
          textAlign: 'center',
        }}>
          <h3 style={{ fontWeight: 800, fontSize: '1.4rem', color: '#0f172a', marginBottom: '8px' }}>
            Your site is ready 🎉
          </h3>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>
            {business.name} — {trade.sections.length} sections selected
          </p>
          <Button size="lg">Get This Site Live</Button>
        </div>
      )}
    </div>
  )
}
