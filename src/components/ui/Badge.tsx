interface BadgeProps {
  children: React.ReactNode
  icon?: string
}

export function Badge({ children, icon }: BadgeProps) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 14px',
      borderRadius: '9999px',
      backgroundColor: 'var(--color-surface)',
      border: '1px solid #e2e8f0',
      fontSize: '0.875rem',
      fontWeight: 600,
      color: 'var(--color-text)',
    }}>
      {icon && <span>{icon}</span>}
      {children}
    </span>
  )
}
