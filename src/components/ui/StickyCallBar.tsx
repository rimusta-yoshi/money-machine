import { Icon } from './Icon'

interface Props {
  phone: string
}

export function StickyCallBar({ phone }: Props) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--line)',
        padding: '10px 14px 14px',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
        boxShadow: '0 -8px 24px rgba(11,37,69,0.08)',
      }}>
        <a href={`tel:${phone.replace(/\D/g, '')}`} style={{
          height: '48px', borderRadius: '12px',
          background: 'var(--accent)', color: '#fff',
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          textDecoration: 'none',
        }}>
          <Icon.Phone size={16} /> Call now
        </a>
        <button style={{
          height: '48px', borderRadius: '12px',
          background: 'var(--navy)', color: '#fff',
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px',
          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          cursor: 'pointer',
        }}>
          <Icon.Chat size={16} /> Free quote
        </button>
      </div>
    </div>
  )
}
