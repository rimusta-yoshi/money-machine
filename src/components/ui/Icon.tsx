import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

const stroke = (path: React.ReactNode) => ({ size = 20, ...props }: IconProps) => (
  <svg
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    width={size} height={size} {...props}
  >
    {path}
  </svg>
)

export const Icon = {
  Phone:   stroke(<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />),
  Drop:    stroke(<path d="M12 3s6 7 6 12a6 6 0 1 1-12 0c0-5 6-12 6-12z" />),
  Wrench:  stroke(<path d="M14.5 3.5a4 4 0 0 0 5 5l-2 2 3 3-3 3-3-3-7 7a2.8 2.8 0 1 1-4-4l7-7-3-3 3-3 3 3 1.5-1.5z" />),
  Boiler:  stroke(<><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M10 16h4" /></>),
  Bath:    stroke(<><path d="M3 12h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3z" /><path d="M6 12V6a2 2 0 0 1 2-2h2" /><path d="M10 7h2" /><path d="M5 19l-1 2M19 19l1 2" /></>),
  Pipe:    stroke(<><path d="M3 9h6a3 3 0 0 1 3 3v0a3 3 0 0 0 3 3h6" /><path d="M3 9V6M3 9v3M21 15v-3M21 15v3" /></>),
  Drain:   stroke(<><circle cx="12" cy="12" r="8" /><path d="M8 10c1.5 1 2.5 1 4 0s2.5-1 4 0M8 14c1.5 1 2.5 1 4 0s2.5-1 4 0" /></>),
  Bolt:    stroke(<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />),
  Tag:     stroke(<><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9z" /><circle cx="8" cy="8" r="1.5" /></>),
  Badge:   stroke(<><path d="M12 2l3 3 4 .5.5 4 3 3-3 3-.5 4-4 .5-3 3-3-3-4-.5-.5-4-3-3 3-3 .5-4 4-.5z" /><path d="M9 12l2 2 4-4" /></>),
  Sparkle: stroke(<><path d="M5 3v4M3 5h4M19 13v4M17 15h4" /><path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" /></>),
  Chat:    stroke(<path d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H9l-5 4v-4H6a3 3 0 0 1-3-3z" />),
  Pin:     stroke(<><path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z" /><circle cx="12" cy="9" r="2.5" /></>),
  Star:    stroke(<path d="M12 3l2.5 6 6.5.5-5 4.5 1.5 6.5L12 17l-5.5 3.5 1.5-6.5-5-4.5L9.5 9z" />),
  Shield:  stroke(<><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></>),
  Mail:    stroke(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>),
  Clock:   stroke(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  Arrow:   stroke(<path d="M5 12h14M13 6l6 6-6 6" />),
  Check:   stroke(<path d="M5 12l4 4 10-10" />),
  Truck:   stroke(<><path d="M3 6h11v10H3z" /><path d="M14 9h4l3 3v4h-7" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>),
  Pound:   stroke(<path d="M16 7a4 4 0 0 0-7-2c-1 1-1 3-1 5v4H6m0 0h11M7 14h7" />),
  Brush:   stroke(<><path d="M3 21c3-3 7-5 9-9 1-2.5-.5-5-2-7" /><path d="M5 17c2-2 3-4 3-6a5 5 0 0 1 10 1c0 4-3 7-5 9" /></>),
  Tree:    stroke(<><path d="M12 22v-7" /><path d="M9 15H5l7-7 7 7h-4" /><path d="M7 11H4l8-8 8 8h-3" /></>),
  Home:    stroke(<><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" /><path d="M9 21V12h6v9" /></>),
  Zap:     stroke(<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />),
  Sun:     stroke(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>),
}
