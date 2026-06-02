import type { BusinessInfo, TradeConfig } from '../../types'

interface Props {
  business: BusinessInfo
  trade: TradeConfig
}

export function AboutPhotoLed({ business, trade }: Props) {
  const years = business.yearsInBusiness || '10+'

  return (
    <section style={{ backgroundColor: 'var(--surface)', padding: '36px 18px 32px' }}>
      <p style={{
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px',
        textTransform: 'uppercase', letterSpacing: '0.14em',
        color: 'var(--accent-ink)', marginBottom: '8px',
      }}>
        About us
      </p>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '22px',
        lineHeight: 1.15, letterSpacing: '-0.01em', color: 'var(--ink)', marginBottom: '16px',
      }}>
        {business.location ? `Local ${trade.name.toLowerCase()} in ${business.location}.` : `Your local ${trade.name.toLowerCase()} team.`}
      </h2>

      {/* Photo placeholder */}
      <div style={{
        height: '170px', borderRadius: '16px', position: 'relative', overflow: 'hidden',
        marginBottom: '16px',
        background: 'repeating-linear-gradient(45deg, var(--accent-tint) 0 10px, #fff 10px 20px)',
        border: '1px solid var(--line)',
      }}>
        <span style={{
          position: 'absolute', left: '12px', bottom: '10px',
          background: 'var(--bg)', padding: '5px 9px', borderRadius: '7px',
          fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--ink)', border: '1px solid var(--line)',
        }}>
          PHOTO · team &amp; van outside
        </span>
      </div>

      <p style={{ fontSize: '14.5px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '16px' }}>
        {business.about ||
          `We're a small team of local engineers — not a national chain. You speak to the same person from quote to follow-up, and we genuinely care about our neighbours recommending us.`}
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {[
          [years, 'Years local'],
          ['2,800+', 'Jobs done'],
          ['4.9★', '312 reviews'],
        ].map(([n, l]) => (
          <div key={l} style={{
            background: 'var(--bg)', border: '1px solid var(--line)',
            borderRadius: '12px', padding: '12px 10px', textAlign: 'center',
          }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: '22px', color: 'var(--navy)', display: 'block', lineHeight: 1,
            }}>{n}</span>
            <span style={{
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '10.5px',
              color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.02em',
              display: 'block', marginTop: '5px',
            }}>{l}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
