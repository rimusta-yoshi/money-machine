import { BRAND } from '../brand/config'
import { Logo } from '../brand/Logo'
import { BUILDER_URL } from './content'
import { HomeHero } from './HomeHero'
import { Examples, Faq, FinalCall, HowItWorks, Pricing, WhatYouGet } from './HomeSections'

/** The landing page at the site root: loud bento tiles, every button leads to the builder. */
export function HomePage() {
  return (
    <div className="hp sb-ui">
      <div className="hp-wrap">
        <header className="hp-top">
          <Logo href="/" size="lg" animate />
          <nav aria-label="Main" className="hp-nav">
            <a href="#examples">Examples</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <a href={BUILDER_URL} className="hp-nav-start">Start building</a>
          </nav>
        </header>

        <main className="hp-main">
          <HomeHero />
          <Examples />
          <HowItWorks />
          <Pricing />
          <WhatYouGet />
          <Faq />
          <FinalCall />
        </main>

        <footer className="hp-foot">
          <span className="hp-foot-name">{BRAND.name}</span>
          <nav aria-label="Footer" className="hp-foot-nav"><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Contact</a></nav>
          <span>Made in the UK</span>
        </footer>
      </div>
    </div>
  )
}
