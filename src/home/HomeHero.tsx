import { BRAND } from '../brand/config'
import { BUILDER_URL, builderFor, HERO_LOOKS, TRADE_LINKS } from './content'
import { SampleHero } from './SampleHero'

/** The top bento: the pitch, a phone flicking through three looks, two numbers and the trade picker. */
export function HomeHero() {
  return (
    <section aria-labelledby="hero-h" className="hp-bento hp-bento--hero">
      <div className="hp-tile hp-pitch sb-rise d1">
        <p className="hp-kicker">Websites for plumbers, sparkies, roofers, gardeners and more</p>
        <h1 id="hero-h" className="hp-h1">Stack a few blocks. Get a website.</h1>
        <p className="hp-lead">
          Pick your trade, pick a look for each section, and you're live in about 15 minutes. {BRAND.price} once. No monthly fees, ever.
        </p>
        <div className="hp-cta-row">
          <a href={BUILDER_URL} className="sb-main-btn hp-btn">Build my site free</a>
          <span className="hp-cta-note">Free to build. Only pay when you're happy.</span>
        </div>
      </div>

      <div className="hp-tile hp-flick sb-rise d2">
        <div className="hp-flick-top">
          <span className="hp-flick-title">Flick through designs</span>
          <span className="hp-dots" aria-hidden="true"><span /><span /><span /></span>
        </div>
        <div className="hp-phone" aria-hidden="true">
          <div className="hp-cycle">
            {HERO_LOOKS.map(look => (
              <div key={look.theme}><SampleHero look={look} width={390} crop className="hp-phone-screen" /></div>
            ))}
          </div>
        </div>
        <p className="hp-flick-note">Same plumber, three looks. You keep the one you like.</p>
      </div>

      <div className="hp-tile hp-stat hp-stat--yellow half sb-tile sb-rise d3">
        <span className="hp-stat-big">15 min</span>
        <span className="hp-stat-small">from nothing to live</span>
      </div>
      <div className="hp-tile hp-stat hp-stat--blue half sb-tile sb-rise d4">
        <span className="hp-stat-big">£0/mo</span>
        <span className="hp-stat-small">{BRAND.price} once and it's yours</span>
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
