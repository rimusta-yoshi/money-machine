import { BRAND } from '../brand/config'
import { BUILDER_URL, FAQS, GETS, HOW_STEPS } from './content'

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
        <span className="hp-compare-note">once. That's it. Money back within {BRAND.guarantee.days} days if you change your mind.</span>
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
