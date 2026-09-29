import { AA, contrastRatio, WHITE } from '../color'
import { rolePalette } from '../roles'
import type { Biome, Neutrals } from './types'

const S = '.sb-sec.sb-th--friendly-local'
const H = '.sb-header.sb-th--friendly-local'

/** Pastel tile colours, one set per ground. Ink and muted text reach AA on every one. */
const PASTELS: Record<string, readonly string[]> = {
  '#FFF7EF': ['#FFE1D2', '#D6EFEE', '#EDE3FA', '#FFF0B8'],
  '#FFFBF4': ['#FFE4D6', '#DDEFE4', '#E6E6FB', '#FFEFC2'],
  '#F6FAF6': ['#DCEFE2', '#FFE6D8', '#E3E9FA', '#FFF1BF'],
}

/**
 * Friendly Local: the neighbours you'd happily let in. A warm cream ground, a chunky
 * rounded grotesque, pastel tiles, big soft corners, a blob behind the photo, a couple of
 * slightly rotated stickers, a speech-bubble review and numbered circles. Playful, never childish.
 */
export const friendlyLocal: Biome = {
  key: 'friendly-local',
  label: 'Friendly Local',
  blurb: 'Warm and chatty: soft colours, rounded shapes, a little playful.',
  fonts: {
    display: { family: 'Bricolage Grotesque', weight: 800, fallback: 'sans-serif' },
    body: { family: 'Nunito Sans', weight: 400, fallback: 'sans-serif' },
    label: { family: 'Nunito Sans', weight: 700, fallback: 'sans-serif' },
  },
  display: { upper: false, tracking: -0.03, leading: 1.02 },
  caps: { upper: false, tracking: 0 },
  h3: 'display',
  scales: [
    { label: 'Big', h1: [84, 76, 66], h1m: [46, 42, 34], h2: [58, 52, 46], h2m: [38, 34, 31], xl: [64, 56, 48], xlm: [40, 36, 32], h3: 24, lead: 20 },
    { label: 'Comfy', h1: [76, 68, 60], h1m: [44, 40, 33], h2: [52, 46, 42], h2m: [36, 32, 30], xl: [56, 50, 44], xlm: [38, 34, 30], h3: 24, lead: 20 },
    { label: 'Snug', h1: [64, 58, 52], h1m: [40, 36, 30], h2: [46, 42, 38], h2m: [33, 30, 28], xl: [50, 44, 40], xlm: [36, 32, 28], h3: 23, lead: 19 },
  ],
  scaleWeights: [1, 1.4, 0.8],
  grounds: [
    { ground: '#FFF7EF', surface: '#FFEDE0', line: '#F1DCCB', ink: '#2B2233', muted: '#4E4556' },
    { ground: '#FFFBF4', surface: '#F4EFFD', line: '#E7E0F2', ink: '#2A2440', muted: '#4D4760' },
    { ground: '#F6FAF6', surface: '#E7F3EA', line: '#D3E5D8', ink: '#1F2B2A', muted: '#465554' },
  ],
  palette: (brand, n: Neutrals) => {
    const tints = (PASTELS[n.ground] ?? PASTELS['#FFF7EF']).filter(t => contrastRatio(n.muted, t) >= AA)
    // Cards and stickers are white, so brand text is tuned for white too.
    return rolePalette(brand, n, tints, [WHITE], [WHITE])
  },
  buttons: { pill: 1 },
  radius: [24, 36],
  density: [1.0, 1.12],
  punch: {
    rotation: [3, 6],
    asym: ['6/6', '7/5', '5/7'],
    align: ['left', 'center', 'split'],
    crop: ['4:5', '1:1', '4:3'],
    bleed: ['none'],
    breaks: ['band', 'panel'],
  },
  motifs: {
    blob: { label: 'Blob behind a photo', sections: ['hero', 'about', 'why_us'], maxPerPage: 2, apart: true },
    sticker: { label: 'Rotated stickers', sections: ['hero', 'about', 'trust_bar', 'certifications'], maxPerPage: 2, apart: true },
    pastel: { label: 'Pastel tiles', sections: ['services', 'why_us', 'areas', 'certifications', 'trust_bar'], maxPerPage: 3 },
    bubble: { label: 'Speech-bubble review', sections: ['testimonials', 'about'], maxPerPage: 1 },
    circles: { label: 'Numbered circles', sections: ['why_us', 'services', 'areas'], maxPerPage: 2 },
  },
  loud: { max: 1, priority: ['contact', 'why_us', 'testimonials', 'certifications'] },
  cards: 'filled',
  voice: {
    eyebrows: {
      services: 'What we do', about: 'About us', why_us: 'Why people call us back', gallery: 'Some recent jobs',
      certifications: 'All above board', testimonials: 'Kind words', areas: 'Where we pop up', contact: 'Say hello', trust_bar: 'Good to know',
    },
    titles: {
      services: 'Things we can help with',
      whyUs: 'Why people call us back',
      gallery: 'Some recent jobs',
      certifications: 'The official bits',
      reviews: 'What our customers say',
      areas: place => (place ? `We cover ${place} and round about` : 'Where we pop up'),
      about: (trade, place) => (place ? `Your friendly ${trade} in ${place}` : `Your friendly local ${trade}`),
      contact: () => 'Give us a shout',
    },
    why: [
      ['We get back to you', 'A quick reply, and we turn up when we said we would.'],
      ['Clear prices', 'You’ll know the price before we start. No nasty surprises.'],
      ['Know our stuff', 'Trained and experienced in the work we do.'],
      ['Tidy as we go', 'Dust sheets down, and we clear up before we leave.'],
      ['Always in touch', 'We’ll keep you posted, and check in once it’s done.'],
    ],
    cta: { call: phone => `Call ${phone}`, callShort: 'Give us a ring', send: 'Send message' },
  },
  css: `
${S} .sb-eyebrow{display:inline-flex;padding:7px 16px;border-radius:999px;background:var(--sb-tint1);color:var(--sb-ink);font-size:15px}
${S} .sb-head--center .sb-eyebrow{align-self:center}
${S} .sb-btn{font-weight:800;font-size:18px;min-height:56px;padding:12px 28px}
${S} .sb-btn--ghost{border:0;box-shadow:inset 0 0 0 2px currentColor}
${S} .sb-link{font-weight:800;text-decoration-thickness:3px;text-decoration-color:var(--sb-accent)}
${S} .sb-card{--sb-fg:var(--sb-ink);--sb-mu:var(--sb-muted);--sb-link:var(--sb-brand-text);--sb-hair:var(--sb-line);--sb-btn-bg:var(--sb-brand-fill);--sb-btn-fg:var(--sb-brand-ink);--sb-btn-edge:var(--sb-brand-edge);
  background:#FFFFFF;color:var(--sb-ink);border-radius:var(--sb-r);padding:30px;box-shadow:0 10px 30px color-mix(in srgb,var(--sb-ink) 9%,transparent)}
${S} .sb-pastel>li:nth-child(4n+1){background:var(--sb-tint1)}
${S} .sb-pastel>li:nth-child(4n+2){background:var(--sb-tint2)}
${S} .sb-pastel>li:nth-child(4n+3){background:var(--sb-tint3)}
${S} .sb-pastel>li:nth-child(4n+4){background:var(--sb-tint4)}
${S} .sb-pastel>li.sb-card{box-shadow:none}
${S} .sb-list>li{border:0;padding:10px 0}
${S} .sb-list>li:last-child{border:0}
${S} .sb-list--num>li::before{content:counter(sb-n);display:grid;place-items:center;width:34px;height:34px;min-width:0;border-radius:50%;background:var(--sb-btn-bg);color:var(--sb-btn-fg);font-family:var(--sb-fb);font-weight:800;font-size:15px;transform:translateY(-3px)}
${S} .sb-list--tick>li::before{width:22px;height:22px}
${S} .sb-chip{background:#FFFFFF;color:var(--sb-ink);border:0;box-shadow:0 4px 14px color-mix(in srgb,var(--sb-ink) 10%,transparent);font-weight:700}
${S} .sb-chip .sb-icon{color:var(--sb-brand-text)}
${S} .sb-photo{border-radius:calc(var(--sb-r) + 12px)}
${S} .sb-blob{background:var(--sb-tint1);border-radius:48% 52% 44% 56% / 52% 44% 56% 48%}
${S} .sb-sticker{padding:14px 20px;border-radius:20px;background:#FFFFFF;color:var(--sb-ink);box-shadow:0 10px 28px color-mix(in srgb,var(--sb-ink) 14%,transparent);font-weight:800;font-size:17px;line-height:1.25}
${S} .sb-sticker--ink{background:var(--sb-ink);color:var(--sb-ground)}
${S} .sb-divider{width:72px;height:10px;border-radius:10px;background:var(--sb-tint2)}
${S} .sb-field input,${S} .sb-field textarea{border-radius:16px;border-width:2px}
${S}.sb-brk--panel>.sb-wrap{border-radius:40px}
${S} .sb-stat-n{letter-spacing:-0.03em}

${H}{min-height:80px;background:var(--sb-ground);color:var(--sb-ink)}
${H} .sb-logo{width:46px;height:46px;border-radius:50%;background:var(--sb-brand-fill);color:var(--sb-brand-ink);box-shadow:inset 0 0 0 2px var(--sb-brand-edge);font-family:var(--sb-fd);font-weight:800;font-size:22px}
${H} .sb-header-name{font-family:var(--sb-fd);font-weight:800;font-size:22px}
${H} .sb-nav a{font-weight:600;font-size:17px}
${H} .sb-header-call{padding:10px 20px;border-radius:999px;background:var(--sb-ink);color:var(--sb-ground);font-weight:700;text-decoration:none}
${H} .sb-header-call .sb-icon{color:currentColor}
`,
}
