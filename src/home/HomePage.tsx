import { BRAND } from '../brand/config'
import { Logo } from '../brand/Logo'
import { BUILDER_URL } from './content'
import { HomeHero } from './HomeHero'
import { Faq, FinalCall, HowItWorks, Pricing, WhatYouGet, WhyOnce } from './HomeSections'

/** The landing page at the site root: loud bento tiles, every button leads to the builder. */
export function HomePage() {
  return (
    <div className="hp sb-ui">
      <div className="hp-wrap">
        <header className="hp-top">
          <Logo href="/" size="lg" animate />
          <nav aria-label="Main" className="hp-nav">
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <a href={BUILDER_URL} className="hp-nav-start">Start building</a>
          </nav>
        </header>

        <main className="hp-main">
          <HomeHero />
          <HowItWorks />
          <Pricing />
          <WhyOnce />
          <WhatYouGet />
          <Faq />
          <FinalCall />
        </main>

        <footer className="hp-foot">
          <span className="hp-foot-name">{BRAND.wordmark}</span>
          <nav aria-label="Footer" className="hp-foot-nav">
            {BRAND.legalPages && <><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></>}
            <a href={`mailto:${BRAND.email}`}>Contact</a>
          </nav>
          <span>Made in the UK</span>
        </footer>
      </div>
    </div>
  )
}
