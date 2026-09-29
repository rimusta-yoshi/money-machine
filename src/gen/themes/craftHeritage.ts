import { rolePalette } from '../roles'
import type { Biome } from './types'

const S = '.sb-sec.sb-th--craft-heritage'
const H = '.sb-header.sb-th--craft-heritage'

/**
 * Craft Heritage: an old family firm's letterhead. Warm paper ground, a soft serif set
 * large and light with one italic word, small tracked capitals, the brand colour as a
 * deep fill, hairline and double rules, dotted leaders like a price list, italic
 * captions and a diamond ornament. Quiet, careful, proud.
 */
export const craftHeritage: Biome = {
  key: 'craft-heritage',
  label: 'Craft Heritage',
  blurb: 'Quiet and careful: warm paper, a fine serif, ruled lines.',
  fonts: {
    display: { family: 'Fraunces', weight: 400, fallback: 'serif' },
    body: { family: 'Libre Franklin', weight: 400, fallback: 'sans-serif' },
    label: { family: 'Libre Franklin', weight: 600, fallback: 'sans-serif' },
  },
  display: { upper: false, tracking: -0.02, leading: 1.05 },
  caps: { upper: true, tracking: 0.18 },
  h3: 'display',
  scales: [
    { label: 'Grand', h1: [96, 84, 72], h1m: [48, 43, 38], h2: [60, 52, 46], h2m: [38, 34, 31], xl: [64, 56, 48], xlm: [40, 36, 32], h3: 28, lead: 20 },
    { label: 'Classic', h1: [88, 76, 66], h1m: [46, 41, 37], h2: [52, 46, 42], h2m: [36, 32, 30], xl: [56, 50, 44], xlm: [38, 34, 30], h3: 27, lead: 20 },
    { label: 'Quiet', h1: [72, 64, 56], h1m: [42, 38, 34], h2: [46, 42, 38], h2m: [34, 30, 28], xl: [50, 44, 40], xlm: [36, 32, 28], h3: 25, lead: 19 },
  ],
  scaleWeights: [1.1, 1.4, 0.8],
  grounds: [
    { ground: '#F4EEE1', surface: '#EAE2D1', line: '#CFC4AE', ink: '#1F2A22', muted: '#3F4A42' },
    { ground: '#F6F1E9', surface: '#ECE4D7', line: '#D3C7B5', ink: '#28221C', muted: '#4B4239' },
    { ground: '#EFF0E7', surface: '#E3E6D8', line: '#C6CBB6', ink: '#1C2620', muted: '#3C4A40' },
  ],
  // Labels on the brand are paper-coloured when that reads, like letterpress on a coloured card.
  palette: (brand, n) => rolePalette(brand, n, [n.surface], [n.ground]),
  buttons: { solid: 0.6, outline: 0.4 },
  radius: [0, 0],
  density: [1.05, 1.2],
  punch: {
    rotation: [0, 0],
    asym: ['6/6', '5/7', '7/5', '4/8'],
    align: ['center', 'left', 'split'],
    crop: ['4:5', '3:2', '4:3'],
    bleed: ['none'],
    breaks: ['band', 'rule'],
  },
  motifs: {
    double: { label: 'Double rules', sections: ['trust_bar', 'services', 'about', 'why_us', 'gallery', 'certifications', 'testimonials', 'areas', 'contact', 'footer'], maxPerPage: 3, apart: true },
    leaders: { label: 'Dotted leaders', sections: ['services', 'areas', 'certifications', 'contact', 'why_us'], maxPerPage: 3 },
    caption: { label: 'Italic captions', sections: ['hero', 'about', 'gallery', 'why_us'], maxPerPage: 3 },
    diamond: { label: 'Diamond divider', sections: ['testimonials', 'about', 'why_us', 'contact', 'certifications'], maxPerPage: 2, apart: true },
  },
  loud: { max: 1, priority: ['contact', 'testimonials', 'why_us', 'about'] },
  cards: 'open',
  voice: {
    eyebrows: {
      services: 'Services', about: 'Our story', why_us: 'Our approach', gallery: 'Recent work', certifications: 'Credentials',
      testimonials: 'In their words', areas: 'The district', contact: 'Get in touch', trust_bar: 'Credentials',
    },
    titles: {
      services: 'What we look after',
      whyUs: 'How we go about things',
      gallery: 'A few recent jobs',
      certifications: 'Credentials',
      reviews: 'Kind words from customers',
      areas: place => (place ? `Serving ${place} and the villages around` : 'Where we work'),
      about: (trade, place) => (place ? `A ${place} ${trade}, done properly` : `Careful ${trade} work, done properly`),
      contact: () => 'Arrange a visit',
    },
    why: [
      ['Prompt replies', 'We answer quickly and arrive when we say we will.'],
      ['Honest quotes', 'A clear quote before any work begins, and no surprises after.'],
      ['Trained hands', 'Properly trained and experienced in the work we take on.'],
      ['Care for your home', 'Floors covered, furniture protected, everything swept after.'],
      ['Kept informed', 'Word as the work goes, and a call once it’s finished.'],
    ],
    cta: { call: phone => `Telephone ${phone}`, callShort: 'Telephone', send: 'Send enquiry' },
  },
  css: `
${S} .sb-eyebrow{font-size:13px;letter-spacing:0.22em}
${S} .sb-em{font-style:italic;color:var(--sb-link)}
${S} .sb-h3{font-weight:400}
${S} .sb-body{line-height:1.75}
${S} .sb-btn{border-radius:0;min-height:56px;padding:14px 32px;font-family:var(--sb-fl);font-weight:600;font-size:15px;letter-spacing:0.14em;text-transform:uppercase}
${S} .sb-btn--outline,${S} .sb-btn--ghost{border-width:1px}
${S} .sb-link{font-family:var(--sb-fd);font-style:italic;font-weight:400;font-size:21px;text-decoration-thickness:1px;text-underline-offset:6px}
${S} .sb-card{border-top:1px solid var(--sb-fg);padding-top:22px}
${S} .sb-list>li{border-top:1px solid var(--sb-hair)}
${S} .sb-list>li:first-child{border-top-color:var(--sb-fg)}
${S} .sb-list>li:last-child{border-bottom-color:var(--sb-fg)}
${S} .sb-list--num>li::before{content:counter(sb-n,upper-roman) ".";min-width:2.6ch;font-style:italic;font-weight:400;font-size:22px}
${S} .sb-list--tick>li::before{width:9px;height:9px;transform:translateY(-3px) rotate(45deg);-webkit-mask:none;mask:none;background:var(--sb-link)}
${S} .sb-dots{border-bottom:1.5px dotted color-mix(in srgb,var(--sb-fg) 55%,transparent)}
${S} .sb-chip{border-radius:0;border-color:var(--sb-fg);font-size:13px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase}
${S} .sb-stat-n{font-weight:400}
${S} .sb-stat-l{font-size:13px;letter-spacing:0.16em;text-transform:uppercase}
${S} .sb-photo{border-radius:0;outline:1px solid color-mix(in srgb,var(--sb-fg) 22%,transparent);outline-offset:-1px}
${S} .sb-cap{font-family:var(--sb-fd);font-style:italic;font-size:16px}
${S} .sb-rule-top{height:5px;border-top:1px solid var(--sb-fg);border-bottom:1px solid var(--sb-fg)}
${S} .sb-divider,${S} .sb-diamond{display:flex;align-items:center;gap:12px;width:150px}
${S} .sb-divider::before,${S} .sb-divider::after,${S} .sb-diamond::before,${S} .sb-diamond::after{content:"";flex:1;height:1px;background:var(--sb-fg)}
${S} .sb-divider>span,${S} .sb-diamond>span{flex:none;width:10px;height:10px;transform:rotate(45deg);background:var(--sb-link)}
${S} .sb-field input,${S} .sb-field textarea{border-radius:0;border-width:1px}
${S} .sb-field{font-size:13px;letter-spacing:0.14em;text-transform:uppercase}
${S} .sb-stars{letter-spacing:3px}

${H}{flex-direction:column;justify-content:center;gap:14px;min-height:0;padding-top:28px;padding-bottom:0;background:var(--sb-ground);color:var(--sb-ink)}
${H} .sb-header-top{display:flex;width:100%;justify-content:space-between;align-items:center;gap:16px;font-family:var(--sb-fl);font-weight:600;font-size:13px;letter-spacing:0.18em;text-transform:uppercase}
${H} .sb-header-name{font-family:var(--sb-fd);font-weight:400;font-size:42px;letter-spacing:-0.01em;text-align:center}
${H} .sb-header-call{color:var(--sb-ink);font-weight:600;text-decoration:underline;text-underline-offset:5px}
${H} .sb-header-call .sb-icon{display:none}
${H} .sb-nav{justify-content:center;width:100%;padding:12px 0 16px;border-bottom:1px solid var(--sb-ink);box-shadow:0 4px 0 -3px var(--sb-ground),0 5px 0 -3px var(--sb-ink)}
${H} .sb-nav a{font-family:var(--sb-fl);font-weight:600;font-size:13px;letter-spacing:0.18em;text-transform:uppercase}
`,
}
