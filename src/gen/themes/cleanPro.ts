import { AA, blendUntil, contrastRatio, mix, WHITE } from '../color'
import { rolePalette } from '../roles'
import type { Biome } from './types'

const S = '.sb-sec.sb-th--clean-pro'
const H = '.sb-header.sb-th--clean-pro'

/**
 * Clean Pro: calm, precise, modern. White and cool greys, tight grotesque headings,
 * pill buttons in the brand colour, bordered cards with soft brand icon tiles, rounded
 * panels and one floating card over a photo. Confident without shouting.
 */
export const cleanPro: Biome = {
  key: 'clean-pro',
  label: 'Clean Pro',
  blurb: 'Calm and precise: white space, rounded panels, crisp type.',
  fonts: {
    display: { family: 'Schibsted Grotesk', weight: 700, fallback: 'sans-serif' },
    body: { family: 'Instrument Sans', weight: 400, fallback: 'sans-serif' },
    label: { family: 'Instrument Sans', weight: 600, fallback: 'sans-serif' },
  },
  display: { upper: false, tracking: -0.035, leading: 1.03 },
  caps: { upper: false, tracking: 0 },
  h3: 'display',
  scales: [
    { label: 'Large', h1: [80, 72, 64], h1m: [46, 42, 34], h2: [64, 56, 48], h2m: [38, 34, 30], xl: [88, 76, 64], xlm: [48, 42, 38], h3: 24, lead: 20 },
    { label: 'Standard', h1: [72, 64, 58], h1m: [42, 38, 32], h2: [56, 50, 44], h2m: [36, 32, 29], xl: [80, 68, 58], xlm: [44, 40, 36], h3: 23, lead: 20 },
    { label: 'Compact', h1: [64, 58, 52], h1m: [38, 34, 30], h2: [50, 44, 40], h2m: [33, 30, 27], xl: [68, 60, 52], xlm: [40, 36, 32], h3: 22, lead: 19 },
  ],
  scaleWeights: [1, 1.4, 0.8],
  grounds: [
    { ground: '#FFFFFF', surface: '#F4F6F8', line: '#E3E7EC', ink: '#0F1720', muted: '#3D4652' },
    { ground: '#FFFFFF', surface: '#F5F5F2', line: '#E6E5E0', ink: '#16181D', muted: '#474A52' },
    { ground: '#FBFCFE', surface: '#EEF2F7', line: '#DDE3EB', ink: '#0B1A2B', muted: '#3A4A5C' },
  ],
  palette: (brand, n) => {
    // A soft brand tint for icon tiles, light enough that body text still reads on it.
    const tint = blendUntil(mix(brand, WHITE, 0.88), WHITE, c => contrastRatio(n.muted, c) >= AA && contrastRatio(n.ink, c) >= AA)
    return rolePalette(brand, n, [tint], [WHITE])
  },
  buttons: { pill: 0.75, solid: 0.25 },
  radius: [16, 22],
  density: [1.0, 1.15],
  punch: {
    rotation: [0, 0],
    asym: ['6/6', '7/5', '5/7'],
    align: ['left', 'center', 'split'],
    crop: ['4:5', '1:1', '4:3', '3:2'],
    bleed: ['none'],
    breaks: ['band', 'panel', 'rule'],
  },
  motifs: {
    floatcard: { label: 'Floating card over a photo', sections: ['hero', 'about', 'gallery'], maxPerPage: 2, apart: true },
    icontile: { label: 'Icon tiles', sections: ['services', 'why_us', 'certifications', 'trust_bar'], maxPerPage: 3 },
    dot: { label: 'Status dot', sections: ['hero', 'contact'], maxPerPage: 1 },
    ticks: { label: 'Tick lists', sections: ['trust_bar', 'why_us', 'certifications', 'hero', 'about', 'areas'], maxPerPage: 3 },
  },
  loud: { max: 1, priority: ['contact', 'why_us', 'testimonials', 'certifications'] },
  cards: 'filled',
  voice: {
    eyebrows: {
      services: 'Services', about: 'About us', why_us: 'Why choose us', gallery: 'Our work', certifications: 'Credentials',
      testimonials: 'Reviews', areas: 'Areas covered', contact: 'Contact', trust_bar: 'Why choose us',
    },
    titles: {
      services: 'What we can help with',
      whyUs: 'What you can expect from us',
      gallery: 'Recent projects',
      certifications: 'Our credentials',
      reviews: 'What our customers say',
      areas: place => (place ? `Covering ${place} and nearby` : 'Where we work'),
      about: (trade, place) => (place ? `Your local ${trade} in ${place}` : `A local ${trade} you can rely on`),
      contact: (_trade, cta) => cta,
    },
    why: [
      ['Quick replies', 'We get back to you promptly and arrive when we say we will.'],
      ['Clear quotes', 'A written quote before any work starts, with no hidden extras.'],
      ['Properly qualified', 'Trained and experienced in the work we take on.'],
      ['Clean and careful', 'We protect your home while we work and tidy up after.'],
      ['Kept informed', 'Updates as the job progresses, and a follow-up when it’s done.'],
    ],
    cta: { call: phone => `Call ${phone}`, callShort: 'Call us', send: 'Send request' },
  },
  css: `
${S} .sb-eyebrow{font-size:15px}
${S} .sb-dot{display:inline-block;flex:none;width:9px;height:9px;margin-right:10px;border-radius:50%;background:var(--sb-accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--sb-accent) 18%,transparent);vertical-align:1px}
${S} .sb-btn{font-weight:600;font-size:18px;min-height:56px;padding:12px 28px}
${S} .sb-btn--ghost{border:1.5px solid var(--sb-hair)}
${S} .sb-card{--sb-fg:var(--sb-ink);--sb-mu:var(--sb-muted);--sb-link:var(--sb-brand-text);--sb-hair:var(--sb-line);--sb-btn-bg:var(--sb-brand-fill);--sb-btn-fg:var(--sb-brand-ink);--sb-btn-edge:var(--sb-brand-edge);
  background:var(--sb-ground);color:var(--sb-ink);border:1px solid var(--sb-line);border-radius:calc(var(--sb-r) + 4px);padding:28px}
${S} .sb-card--soft{background:var(--sb-surface);border-color:transparent}
${S} .sb-icon-tile{display:grid;place-items:center;width:48px;height:48px;border-radius:12px;background:var(--sb-tint1)}
${S} .sb-icon-tile .sb-icon{color:var(--sb-brand-text)}
${S} .sb-list>li{border-color:var(--sb-hair)}
${S} .sb-list--num>li::before{display:grid;place-items:center;width:34px;height:34px;min-width:0;border-radius:50%;background:var(--sb-tint1);color:var(--sb-brand-text);font-family:var(--sb-fl);font-weight:600;font-size:14px;transform:translateY(-6px)}
${S} .sb-chip{background:var(--sb-ground);color:var(--sb-ink);border-color:var(--sb-line)}
${S} .sb-chip .sb-icon{color:var(--sb-brand-text)}
${S} .sb-photo{border-radius:calc(var(--sb-r) + 6px)}
${S} .sb-float{--sb-fg:var(--sb-ink);background:var(--sb-ground);color:var(--sb-ink);border-radius:16px;box-shadow:0 14px 36px rgba(15,23,32,0.14);padding:18px 22px;display:flex;flex-direction:column;gap:6px;font-size:16px;line-height:1.45}
${S} .sb-float-l{font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--sb-muted)}
${S} .sb-float .sb-stars{color:var(--sb-brand-text)}
${S} .sb-rule-top{border-top:1px solid var(--sb-hair)}
${S} .sb-divider{width:56px;height:4px;border-radius:4px;background:var(--sb-accent)}
${S} .sb-field input,${S} .sb-field textarea{border-radius:12px}
${S}.sb-brk--panel>.sb-wrap{border-radius:28px}
${S} .sb-stat-n{letter-spacing:-0.04em;color:var(--sb-link)}
${S} .sb-card .sb-h3{font-size:calc(var(--sb-h3) * 1.05)}

${H}{min-height:76px;background:var(--sb-ground);color:var(--sb-ink)}
${H} .sb-header-name{font-family:var(--sb-fd);font-weight:800;font-size:22px;letter-spacing:-0.02em}
${H} .sb-header-name .sb-name-dot{color:var(--sb-brand-text)}
${H} .sb-nav a{font-weight:500;font-size:16px}
${H} .sb-header-call{padding:8px 18px;border:2px solid var(--sb-brand-edge);border-radius:999px;background:var(--sb-brand-fill);color:var(--sb-brand-ink);font-weight:600;text-decoration:none}
${H} .sb-header-call .sb-icon{color:currentColor}
`,
}
