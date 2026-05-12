import { useState } from 'react'
import type { BusinessInfo, SectionConfig, TradeConfig } from '../types'
import { SectionRenderer } from '../components/sections/SectionRenderer'

interface Props {
  section: SectionConfig
  trade: TradeConfig
  business: BusinessInfo
  selectedVariantId: string
  onSelect: (variantId: string) => void
  slotIndex: number
}

export function SectionSlot({ section, trade, business, selectedVariantId, onSelect, slotIndex }: Props) {
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.max(0, section.variants.findIndex(v => v.id === section.recommended))
  )

  const variant = section.variants[currentIndex]
  const isSelected = variant.id === selectedVariantId
  const isRecommended = variant.id === section.recommended

  const prev = () => setCurrentIndex(i => (i - 1 + section.variants.length) % section.variants.length)
  const next = () => setCurrentIndex(i => (i + 1) % section.variants.length)

  const SECTION_LABELS: Record<string, string> = {
    hero: 'Hero',
    services: 'Services',
    gallery: 'Gallery',
    trust: 'Trust',
    certifications: 'Certifications',
    testimonials: 'Testimonials',
    contact: 'Contact',
  }

  return (
    <div style={{
      border: `2px solid ${isSelected ? trade.colorScheme.primary : '#e2e8f0'}`,
      borderRadius: '16px',
      overflow: 'hidden',
      transition: 'border-color 0.2s',
      backgroundColor: '#fff',
    }}>
      {/* Slot header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        borderBottom: '1px solid #f1f5f9',
        backgroundColor: isSelected ? `${trade.colorScheme.primary}08` : '#fafafa',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: isSelected ? trade.colorScheme.primary : '#e2e8f0',
            color: isSelected ? '#fff' : '#94a3b8',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {isSelected ? '✓' : slotIndex + 1}
          </span>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
            {SECTION_LABELS[section.type]}
          </span>
          {isRecommended && (
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: `${trade.colorScheme.primary}18`,
              color: trade.colorScheme.primary,
            }}>
              Recommended
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {section.variants.length > 1 && (
            <>
              <button onClick={prev} style={navBtnStyle}>‹</button>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', minWidth: '50px', textAlign: 'center' }}>
                {currentIndex + 1} / {section.variants.length}
              </span>
              <button onClick={next} style={navBtnStyle}>›</button>
            </>
          )}
          <button
            onClick={() => onSelect(variant.id)}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: isSelected ? trade.colorScheme.primary : '#f1f5f9',
              color: isSelected ? '#fff' : '#475569',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {isSelected ? 'Selected ✓' : 'Select'}
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div style={{ position: 'relative' }}>
        {/* Variant label */}
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 10,
          backgroundColor: 'rgba(0,0,0,0.55)',
          color: '#fff',
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '0.75rem',
          fontWeight: 600,
          pointerEvents: 'none',
        }}>
          {variant.label}
        </div>

        {/* Actual section preview */}
        <div style={{
          transform: 'scale(1)',
          transformOrigin: 'top left',
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
          <SectionRenderer componentName={variant.component} business={business} trade={trade} />
        </div>
      </div>
    </div>
  )
}

const navBtnStyle: React.CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '6px',
  border: '1.5px solid #e2e8f0',
  backgroundColor: '#fff',
  cursor: 'pointer',
  fontSize: '1.1rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#475569',
  padding: 0,
}
