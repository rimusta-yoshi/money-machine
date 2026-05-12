interface StickyCallBarProps {
  phone: string
  ctaText: string
}

export function StickyCallBar({ phone, ctaText }: StickyCallBarProps) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'var(--color-primary)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 20px',
      zIndex: 1000,
      boxShadow: '0 -2px 12px rgba(0,0,0,0.15)',
    }}>
      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{ctaText}</span>
      <a
        href={`tel:${phone.replace(/\D/g, '')}`}
        style={{
          backgroundColor: '#fff',
          color: 'var(--color-primary)',
          fontWeight: 800,
          padding: '8px 18px',
          borderRadius: '6px',
          textDecoration: 'none',
          fontSize: '1rem',
          letterSpacing: '-0.01em',
        }}
      >
        {phone}
      </a>
    </div>
  )
}
