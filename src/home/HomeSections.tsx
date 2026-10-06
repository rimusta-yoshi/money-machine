import { BRAND } from '../brand/config'
import { BUILDER_URL, EXAMPLES, FAQS, GETS, HOW_STEPS } from './content'
import { SampleHero } from './SampleHero'

/** Example sites, rendered by the real generator: one per style, each a different trade. */
export function Examples() {
  return (
    <section id="examples" aria-labelledby="ex-h" className="hp-bento hp-bento--examples">
      <div className="hp-head">
        <h2 id="ex-h" className="hp-h2">Every site looks different</h2>
        <p className="hp-head-text">Four styles, thousands of layouts. These example sites were all made with the builder.</p>
      </div>
      <ul className="hp-examples" role="list">
        {EXAMPLES.map(ex => (
          <li key={ex.label} className={`hp-example hp-example--${ex.span} sb-tile`}>
            <SampleHero look={ex.look} width={ex.width} crop className="hp-example-shot" />
            <span className="hp-example-tag">{ex.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

const HOW_COLOURS = ['brick', 'yellow', 'lawn'] as const

export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-h" className="hp-bento">
      <h2 id="how-h" className="hp-h2 hp-span-all hp-h2--spaced">Three picks and you're live</h2>
      <ol className="hp-how" role="list">
        {HOW_STEPS.map((s, i) => (
          <li key={s.title} className={`hp-tile hp-how-step hp-how-step--${HOW_COLOURS[i]} sb-tile`}>
            <span className="hp-how-n" aria-hidden="true">{i + 1}</span>
            <h3 className="hp-h3">{s.title}</h3>
            <p>{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function Pricing() {
  return (
    <section id="pricing" aria-labelledby="price-h" className="hp-bento hp-gap-top">
      <div className="hp-tile hp-price-pitch">
        <h2 id="price-h" className="hp-h2">Pay once. Own it.</h2>
        <p>Most website builders charge you every month, forever. We charge you once, when you're happy with your site.</p>
        <a href={BUILDER_URL} className="sb-main-btn hp-btn hp-btn--start">Build my site free</a>
      </div>
      <div className="hp-tile hp-compare hp-compare--them half sb-tile">
        <span className="hp-compare-label">A £15-a-month plan</span>
        <span className="hp-compare-big">£540</span>
        <span className="hp-compare-note">over three years, and still counting</span>
      </div>
      <div className="hp-tile hp-compare hp-compare--us half sb-tile">
        <span className="hp-compare-label">{BRAND.name}</span>
        <span className="hp-compare-big">{BRAND.price}</span>
        <span className="hp-compare-note">once. That's it.</span>
      </div>
    </section>
  )
}

const GET_COLOURS = ['brick', 'yellow', 'lawn', 'night', 'blue', 'brick'] as const

export function WhatYouGet() {
  return (
    <section aria-labelledby="get-h" className="hp-bento hp-gap-top">
      <div className="hp-tile hp-get-title">
        <h2 id="get-h" className="hp-h2">What you get for {BRAND.price}</h2>
        <p>Everything a tradesperson needs from a website. Nothing you'll never use.</p>
      </div>
      <ul className="hp-gets" role="list">
        {GETS.map((g, i) => (
          <li key={g.title} className="hp-tile hp-get sb-tile">
            <span className={`hp-get-block hp-get-block--${GET_COLOURS[i]}`} aria-hidden="true" />
            <b>{g.title}</b>
            <span>{g.text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-h" className="hp-bento hp-gap-top">
      <div className="hp-tile hp-faq-title"><h2 id="faq-h" className="hp-h2">Fair questions</h2></div>
      <div className="hp-faqs">
        {FAQS.map(f => (
          <details key={f.q} className="hp-faq">
            <summary>{f.q}<span className="hp-plus" aria-hidden="true">+</span></summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export function FinalCall() {
  return (
    <section aria-labelledby="cta-h" className="hp-bento hp-gap-top">
      <div className="hp-tile hp-final">
        <h2 id="cta-h" className="hp-h2 hp-h2--final">Your website is three picks away.</h2>
        <a href={BUILDER_URL} className="sb-main-btn hp-btn hp-btn--dark">Build my site free</a>
      </div>
      <div className="hp-final-blocks" aria-hidden="true"><span className="sb-tile" /><span className="sb-tile" /><span className="sb-tile" /><span className="sb-tile" /></div>
    </section>
  )
}
