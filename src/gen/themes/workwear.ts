import { rolePalette } from '../roles'
import { article } from './voice'
import type { Biome } from './types'

const S = '.sb-sec.sb-th--workwear'
const H = '.sb-header.sb-th--workwear'

/**
 * Workwear: hi-vis on a dark ground. Condensed uppercase display type, the brand colour
 * as a bright accent with near-black text on it, square corners, hazard stripes, ghost
 * numerals and thick accent rules. Loud and blunt, never messy.
 */
export const workwear: Biome = {
  key: 'workwear',
  label: 'Workwear',
  blurb: 'Bold and blunt: dark ground, bright accent, big condensed type.',
  fonts: {
    display: { family: 'Anton', weight: 400, fallback: 'sans-serif' },
    body: { family: 'Barlow', weight: 400, fallback: 'sans-serif' },
    label: { family: 'Barlow Condensed', weight: 700, fallback: 'sans-serif' },
  },
  display: { upper: true, tracking: 0.005, leading: 0.94 },
  caps: { upper: true, tracking: 0.08 },
  h3: 'label',
  scales: [
    { label: 'Poster', h1: [128, 112, 96], h1m: [60, 52, 46], h2: [80, 72, 64], h2m: [48, 42, 38], xl: [96, 84, 72], xlm: [52, 46, 40], h3: 28, lead: 21 },
    { label: 'Bold', h1: [112, 100, 88], h1m: [56, 48, 42], h2: [72, 64, 56], h2m: [44, 40, 36], xl: [84, 72, 64], xlm: [48, 42, 38], h3: 27, lead: 20 },
    { label: 'Compact', h1: [96, 88, 76], h1m: [50, 44, 40], h2: [64, 56, 50], h2m: [40, 36, 32], xl: [72, 64, 56], xlm: [44, 40, 36], h3: 25, lead: 19 },
  ],
  scaleWeights: [1.2, 1.5, 1],
  grounds: [
    { ground: '#111110', surface: '#1B1B19', line: '#2A2A27', ink: '#F4F1EA', muted: '#CFCBC2' },
    { ground: '#0F1214', surface: '#181C1F', line: '#272D31', ink: '#EEF1F2', muted: '#C3CACE' },
    { ground: '#15120E', surface: '#1F1B16', line: '#302A22', ink: '#F7F0E4', muted: '#D4CABA' },
  ],
  // The brand is the accent on near-black: its label is the near-black ground when that reads.
  palette: (brand, n) => rolePalette(brand, n, [], [n.ground]),
  buttons: { solid: 0.7, offset: 0.3 },
  radius: [0, 0],
  density: [0.95, 1.08],
  punch: {
    rotation: [0, 0],
    asym: ['7/5', '8/4', '6/6', '5/7'],
    align: ['left', 'split'],
    crop: ['4:5', '1:1', '4:3', '3:2'],
    bleed: ['none', 'edge'],
    breaks: ['band', 'panel', 'rule'],
  },
  motifs: {
    stripe: { label: 'Hazard stripe', sections: ['hero', 'about', 'why_us', 'gallery', 'certifications', 'contact'], maxPerPage: 2, apart: true },
    numbers: { label: 'Numbered items', sections: ['services', 'why_us', 'areas', 'certifications'], maxPerPage: 3 },
    toprule: { label: 'Thick accent rules', sections: ['services', 'why_us', 'certifications', 'trust_bar', 'testimonials', 'about'], maxPerPage: 4 },
    bigphone: { label: 'Giant phone number', sections: ['hero', 'contact'], maxPerPage: 1 },
  },
  loud: { max: 2, priority: ['trust_bar', 'contact', 'why_us', 'certifications', 'services', 'testimonials'] },
  cards: 'open',
  voice: {
    eyebrows: {
      services: 'What we do', about: 'Who we are', why_us: 'How we work', gallery: 'On the job', certifications: 'Credentials',
      testimonials: 'Word of mouth', areas: 'Where we work', contact: 'Get it sorted', trust_bar: 'Why us',
    },
    titles: {
      services: 'What we do',
      whyUs: 'No messing about',
      gallery: 'Recent jobs',
      certifications: 'Credentials',
      reviews: 'What customers say',
      areas: place => (place ? `Working across ${place}` : 'Where we work'),
      about: (trade, place) => (place ? `Your ${trade} in ${place}` : `Your local ${trade}`),
      contact: trade => `Need ${article(trade)} ${trade}?`,
    },
    why: [
      ['Quick to respond', 'We pick up, call back and turn up when we say.'],
      ['Straight pricing', 'A clear quote before we start. No surprises on the bill.'],
      ['Trained for the job', 'Proper training and experience in the work we do.'],
      ['Clean site', 'Dust sheets down first. Mess gone when we leave.'],
      ['Kept in the loop', 'Updates as the job goes, and a check once it’s done.'],
    ],
    cta: { call: phone => `Call ${phone}`, callShort: 'Call now', send: 'Send it' },
  },
  css: `
${S}{--sb-ghost:color-mix(in srgb,var(--sb-fg) 15%,transparent)}
${S} .sb-eyebrow{font-size:18px;letter-spacing:0.16em}
${S} .sb-h3{line-height:1.05}
${S} .sb-body{font-size:19px}
${S} .sb-btn{border-radius:0;min-height:60px;padding:12px 30px;font-family:var(--sb-fl);font-weight:700;font-size:21px;letter-spacing:0.06em;text-transform:uppercase}
${S} .sb-btn--ghost{border-width:2px}
${S} .sb-link{font-family:var(--sb-fl);font-weight:700;font-size:19px;letter-spacing:0.06em;text-transform:uppercase;color:var(--sb-link);text-decoration-thickness:3px}
${S} .sb-card{border-top:6px solid var(--sb-accent);padding-top:22px}
${S} .sb-list>li{border-top-width:2px}
${S} .sb-list--num>li::before{font-size:46px;line-height:0.85;color:var(--sb-ghost);min-width:2.3ch}
${S} .sb-list--tick>li::before{width:12px;height:12px;transform:translateY(-2px);-webkit-mask:none;mask:none;background:var(--sb-accent)}
${S} .sb-chip{border-radius:0;border:2px solid currentColor;font-family:var(--sb-fl);font-weight:700;font-size:17px;letter-spacing:0.06em;text-transform:uppercase}
${S} .sb-stat-n{color:var(--sb-link)}
${S} .sb-stat-l{font-family:var(--sb-fl);font-weight:700;letter-spacing:0.08em;text-transform:uppercase}
${S} .sb-photo{border-radius:0}
${S} .sb-stripe{background:repeating-linear-gradient(-45deg,var(--sb-accent) 0 14px,var(--sb-bg) 14px 28px)}
${S} .sb-rule-top{height:12px;background:repeating-linear-gradient(-45deg,var(--sb-accent) 0 12px,transparent 12px 24px)}
${S} .sb-divider{height:12px;width:160px;background:repeating-linear-gradient(-45deg,var(--sb-accent) 0 12px,transparent 12px 24px)}
${S} .sb-cap{font-family:var(--sb-fl);font-weight:600;letter-spacing:0.1em;text-transform:uppercase}
${S} .sb-field input,${S} .sb-field textarea{border:2px solid color-mix(in srgb,var(--sb-ink) 45%,transparent);border-radius:0}
${S} .sb-field{font-family:var(--sb-fl);font-weight:700;letter-spacing:0.06em;text-transform:uppercase}
${S}.sb-brk--panel>.sb-wrap{border-radius:0}
${S} .sb-stars{letter-spacing:4px}

${H}{min-height:76px;background:var(--sb-ground);color:var(--sb-ink);border-bottom:1px solid var(--sb-line)}
${H} .sb-logo{width:44px;height:44px;background:var(--sb-brand-fill);color:var(--sb-brand-ink);box-shadow:inset 0 0 0 2px var(--sb-brand-edge);font-family:var(--sb-fd);font-size:24px}
${H} .sb-header-name{font-family:var(--sb-fd);font-weight:400;font-size:24px;letter-spacing:0.02em;text-transform:uppercase}
${H} .sb-nav a{font-family:var(--sb-fl);font-weight:600;font-size:17px;letter-spacing:0.08em;text-transform:uppercase}
${H} .sb-header-call{background:var(--sb-brand-fill);color:var(--sb-brand-ink);border:2px solid var(--sb-brand-edge);padding:6px 16px;font-family:var(--sb-fl);font-weight:700;font-size:20px;letter-spacing:0.04em;text-decoration:none}
${H} .sb-header-call .sb-icon{color:currentColor}
`,
}
