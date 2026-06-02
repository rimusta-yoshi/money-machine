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

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero',
  trust_bar: 'Trust Bar',
  services: 'Services',
  about: 'About',
  why_us: 'Why Us',
  gallery: 'Gallery',
  certifications: 'Certifications',
  testimonials: 'Reviews',
  areas: 'Service Areas',
  contact: 'Contact',
}

export function SectionSlot({ section, trade, business, selectedVariantId, onSelect, slotIndex }: Props) {
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.max(0, section.variants.findIndex(v => v.id === section.recommended))
  )

  const variant = section.variants[currentIndex]
  const isSelected = variant.id === selectedVariantId
  const isRecommended = variant.id === section.recommended
  const { accent, accentTint, accentInk } = trade.colorScheme

  const prev = () => setCurrentIndex(i => (i - 1 + section.variants.length) % section.variants.length)
  const next = () => setCurrentIndex(i => (i + 1) % section.variants.length)

  return (
    <div style={{
      border: `2px solid ${isSelected ? accent : 'var(--line)'}`,
      borderRadius: '16px',
      overflow: 'hidden',
      transition: 'border-color 0.2s',
      backgroundColor: 'var(--bg)',
    }}>
      {/* Slot header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: `1px solid var(--line)`,
        backgroundColor: isSelected ? accentTint : 'var(--surface)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            width: '22px', height: '22px', borderRadius: '50%',
            backgroundColor: isSelected ? accent : 'var(--line)',
            color: isSelected ? '#fff' : 'var(--muted)',
            fontSize: '0.72rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isSelected ? '✓' : slotIndex + 1}
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>
            {SECTION_LABELS[section.type] ?? section.type}
          </span>
          {isRecommended && (
            <span style={{
              fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px',
              borderRadius: '999px', backgroundColor: accentTint, color: accentInk,
            }}>
              Recommended
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {section.variants.length > 1 && (
            <>
              <button onClick={prev} style={navBtnStyle}>‹</button>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', minWidth: '44px', textAlign: 'center' }}>
                {currentIndex + 1} / {section.variants.length}
              </span>
              <button onClick={next} style={navBtnStyle}>›</button>
            </>
          )}
          <button
            onClick={() => onSelect(variant.id)}
            style={{
              padding: '6px 14px', borderRadius: '8px', border: 'none',
              backgroundColor: isSelected ? accent : 'var(--bg)',
              color: isSelected ? '#fff' : 'var(--muted)',
              fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
              outline: isSelected ? 'none' : `1.5px solid var(--line)`,
              transition: 'all 0.15s',
            }}
          >
            {isSelected ? 'Selected ✓' : 'Select'}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', top: '10px', right: '10px', zIndex: 10,
          backgroundColor: 'rgba(11,37,69,0.6)', color: '#fff',
          padding: '3px 9px', borderRadius: '6px',
          fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
          pointerEvents: 'none',
        }}>
          {variant.label}
        </div>
        <div style={{ pointerEvents: 'none', userSelect: 'none' }}>
          <SectionRenderer componentName={variant.component} business={business} trade={trade} />
        </div>
      </div>
    </div>
  )
}

const navBtnStyle: React.CSSProperties = {
  width: '26px', height: '26px', borderRadius: '6px',
  border: '1.5px solid var(--line)', backgroundColor: 'var(--bg)',
  cursor: 'pointer', fontSize: '1rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--muted)', padding: 0,
}
