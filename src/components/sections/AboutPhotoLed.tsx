import type { BusinessInfo, TradeConfig } from '../../types'

interface Props {
  business: BusinessInfo
  trade: TradeConfig
}

export function AboutPhotoLed({ business, trade }: Props) {
  const years = business.yearsInBusiness || '10+'

  return (
    <section className="ff-section alt">
      <div className="ff-about-photo">
        <div className="ff-section-head">
          <span className="ff-eyebrow">About us</span>
          <h2>{business.location ? `Local ${trade.name.toLowerCase()} in ${business.location}.` : `Your local ${trade.name.toLowerCase()} team.`}</h2>
        </div>
        <div className="about-photo">
          <span className="cap">PHOTO · team &amp; van outside</span>
        </div>
        <p className="about-body">
          {business.about || `We're a small team of local engineers — not a national chain. You speak to the same person from quote to follow-up, and we genuinely care about our neighbours recommending us.`}
        </p>
        <div className="about-stats">
          {[
            [years, 'Years local'],
            ['2,800+', 'Jobs done'],
            ['4.9★', '312 reviews'],
          ].map(([n, l]) => (
            <div className="about-stat" key={l}>
              <span className="n">{n}</span>
              <span className="l">{l}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
