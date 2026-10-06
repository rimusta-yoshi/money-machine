import { BRAND } from '../brand/config'
import { BUILDER_URL, builderFor, TRADE_LINKS } from './content'

/** The top bento: the pitch, the price with the money-back guarantee, two numbers and the trade picker. */
export function HomeHero() {
  return (
    <section aria-labelledby="hero-h" className="hp-bento hp-bento--hero">
      <div className="hp-tile hp-pitch sb-rise d1">
        <p className="hp-kicker">Websites for plumbers, sparkies, roofers, gardeners and more</p>
        <h1 id="hero-h" className="hp-h1">Stack a few blocks. Get a website.</h1>
        <p className="hp-lead">
          Pick your trade, pick a look for each section, and you're live in about 15 minutes. No monthly fees, ever.
        </p>
        <div className="hp-cta-row">
          <a href={BUILDER_URL} className="sb-main-btn hp-btn">Build my site free</a>
          <span className="hp-cta-note">Free to build. Only pay when you're happy.</span>
        </div>
      </div>

      <div className="hp-tile hp-price sb-rise d2">
        <div className="hp-price-top">
          <span className="hp-price-label">One price</span>
          <span className="hp-price-mark" aria-hidden="true"><span /><span /><span /><span /></span>
        </div>
        <p className="hp-price-main"><span className="hp-price-big">{BRAND.price}</span><span className="hp-price-once">once. That's it.</span></p>
        <div className="hp-guarantee">
          <span className="hp-guarantee-badge" aria-hidden="true"><b>{BRAND.guarantee.days}</b>days</span>
          <p><b>Money-back guarantee.</b> Not happy? Get your {BRAND.price} back within {BRAND.guarantee.days} days. No questions asked.</p>
        </div>
      </div>

      <div className="hp-tile hp-stat hp-stat--mist half sb-tile sb-rise d3">
        <span className="hp-stat-big">15 min</span>
        <span className="hp-stat-small">from nothing to live</span>
      </div>
      <div className="hp-tile hp-stat hp-stat--blue half sb-tile sb-rise d4">
        <span className="hp-stat-big">£0/mo</span>
        <span className="hp-stat-small">no subscriptions, ever</span>
      </div>

      <div className="hp-tile hp-trades sb-rise d5">
        <h2 id="trade-h" className="hp-trades-title">What's your trade?</h2>
        <ul className="hp-chips" aria-labelledby="trade-h">
          {TRADE_LINKS.map(t => (
            <li key={t.id}><a href={builderFor(t.id)} className="hp-chip">{t.label}</a></li>
          ))}
        </ul>
      </div>
    </section>
  )
}
