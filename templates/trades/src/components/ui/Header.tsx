interface Props {
  logoPath: string
  businessName: string
  phone: string
}

export function Header({ logoPath, businessName, phone }: Props) {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backgroundColor: 'var(--color-bg)',
      borderBottom: '1px solid rgba(0,0,0,0.08)',
      padding: '14px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {logoPath ? (
          <img src={logoPath} alt={businessName} style={{ height: '48px', width: 'auto', objectFit: 'contain' }} />
        ) : (
          <span style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            {businessName}
          </span>
        )}
      </div>
      {phone && (
        <a
          href={`tel:${phone.replace(/\D/g, '')}`}
          style={{
            fontWeight: 700,
            fontSize: '1rem',
            color: 'var(--color-primary)',
            textDecoration: 'none',
            letterSpacing: '-0.01em',
          }}
        >
          {phone}
        </a>
      )}
    </header>
  )
}
