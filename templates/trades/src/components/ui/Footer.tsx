interface Props {
  businessName: string
  social: { facebook: string; instagram: string }
}

export function Footer({ businessName, social }: Props) {
  const hasSocial = social.facebook || social.instagram

  return (
    <footer style={{
      backgroundColor: 'var(--color-surface)',
      borderTop: '1px solid rgba(0,0,0,0.08)',
      padding: '32px',
      textAlign: 'center',
    }}>
      {hasSocial && (
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '16px' }}>
          {social.facebook && (
            <a
              href={social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none' }}
            >
              Facebook
            </a>
          )}
          {social.instagram && (
            <a
              href={social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none' }}
            >
              Instagram
            </a>
          )}
        </div>
      )}
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        © {new Date().getFullYear()} {businessName}. All rights reserved.
      </p>
    </footer>
  )
}
