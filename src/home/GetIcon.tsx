export type GetIconName = 'globe' | 'phone' | 'pencil' | 'palette' | 'access' | 'shield'

const PATHS: Record<GetIconName, React.ReactNode> = {
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
  phone: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18h2" /></>,
  pencil: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13 7l4 4" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 3 0 4-1 2-3 2-4a9 9 0 0 0-8-8z" /><circle cx="8" cy="11" r="1.2" /><circle cx="12" cy="7.5" r="1.2" /><circle cx="16" cy="11" r="1.2" /></>,
  access: <><circle cx="12" cy="4.5" r="1.8" /><path d="M5 8.5l7 1.5 7-1.5M12 10v4.5l-3 6M12 14.5l3 6" /></>,
  shield: <><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>,
}

/** Line icons for "What you get". Decorative: the card's title says what it is. */
export function GetIcon({ name }: { name: GetIconName }) {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  )
}
