import { useState } from 'react'
import type { TradeConfig, BusinessInfo } from '../types'
import { Button } from '../components/ui/Button'

interface Props {
  trade: TradeConfig
  onSubmit: (info: BusinessInfo) => void
  onBack: () => void
}

const EMPTY: BusinessInfo = { name: '', phone: '', location: '', about: '', yearsInBusiness: '' }

export function SetupForm({ trade, onSubmit, onBack }: Props) {
  const [info, setInfo] = useState<BusinessInfo>(EMPTY)

  const set = (field: keyof BusinessInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setInfo(prev => ({ ...prev, [field]: e.target.value }))

  const valid = info.name.trim().length > 0 && info.phone.trim().length > 0

  const inputStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1.5px solid #e2e8f0',
    fontSize: '1rem',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    backgroundColor: '#fff',
    color: '#0f172a',
  }

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', padding: '40px 24px' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', marginBottom: '24px', fontSize: '0.9rem', padding: 0 }}>
        ← Change trade
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <span style={{ fontSize: '2.5rem' }}>{trade.emoji}</span>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>{trade.name} Details</h2>
      </div>
      <p style={{ color: '#64748b', marginBottom: '32px' }}>Tell us about your business — this fills your site automatically.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.9rem', color: '#0f172a' }}>
            Business Name <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input style={inputStyle} placeholder="e.g. Mackay's Painting" value={info.name} onChange={set('name')} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.9rem', color: '#0f172a' }}>
            Phone Number <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input style={inputStyle} placeholder="e.g. (604) 555-0123" value={info.phone} onChange={set('phone')} type="tel" />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.9rem', color: '#0f172a' }}>
            City / Area Served
          </label>
          <input style={inputStyle} placeholder="e.g. Vancouver, BC" value={info.location} onChange={set('location')} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.9rem', color: '#0f172a' }}>
            Years in Business
          </label>
          <input style={inputStyle} placeholder="e.g. 12" value={info.yearsInBusiness} onChange={set('yearsInBusiness')} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.9rem', color: '#0f172a' }}>
            Short About Blurb
          </label>
          <textarea
            style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
            placeholder="Family-owned and operated. Fully licensed and insured…"
            value={info.about}
            onChange={set('about')}
          />
        </div>
        <Button size="lg" fullWidth onClick={() => valid && onSubmit(info)} style={{ opacity: valid ? 1 : 0.45, marginTop: '8px' }}>
          Build My Site →
        </Button>
      </div>
    </div>
  )
}
