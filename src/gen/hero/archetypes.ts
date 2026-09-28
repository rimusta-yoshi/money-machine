import { inRange, pick, round2 } from '../rng'
import type { Rng } from '../rng'
import type { ArchetypeKey, HeroSpec, ParamsOf, Tone } from '../schema'
import { hasPhoto, reviewCount } from './content'
import type { HeroContent } from './content'

/**
 * The eight hero archetypes ("rooms"): hand-authored structures with knobs the generator
 * rolls. Content gates which ones are allowed. Mobile layouts live in the CSS
 * (container queries), keyed by the same parameters.
 */
export interface Archetype<K extends ArchetypeKey> {
  label: string
  /** Content this archetype needs to be honest. */
  gate: (c: HeroContent) => boolean
  why: string
  params: (r: Rng, c: HeroContent) => ParamsOf<K>
  /** Numbers in 0..1 describing the parameters, for the distinctness filter. */
  features: (p: ParamsOf<K>) => number[]
  describe: (p: ParamsOf<K>) => string
}

const TONE_WEIGHTS: readonly Tone[] = ['ground', 'ground', 'surface', 'brand']
const tone = (r: Rng): Tone => pick(r, TONE_WEIGHTS)
const toneFeature = (t: Tone) => ({ ground: 0, surface: 0.5, brand: 1 })[t]
const pct = (x: number) => `${Math.round(x * 100)}%`

export const ARCHETYPES: { [K in ArchetypeKey]: Archetype<K> } = {
  split: {
    label: 'Split',
    gate: hasPhoto,
    why: 'needs a photo',
    params: (r, c) => ({
      ratio: pick(r, [0.5, 0.56, 0.62]),
      side: pick(r, ['right', 'left'] as const),
      valign: pick(r, ['center', 'top'] as const),
      proof: c.rating || c.badges.length ? pick(r, ['under', 'strip'] as const) : 'none',
      mobilePhoto: pick(r, ['top', 'bottom'] as const),
      tone: tone(r),
    }),
    features: p => [(p.ratio - 0.5) * 4, p.side === 'right' ? 1 : 0, p.valign === 'center' ? 1 : 0, p.proof === 'strip' ? 1 : 0, toneFeature(p.tone)],
    describe: p => `${pct(p.ratio)} text, photo ${p.side}, ${p.valign === 'center' ? 'centred' : 'top aligned'}, proof ${p.proof}, ${p.tone} background`,
  },
  overlay: {
    label: 'Overlay',
    gate: hasPhoto,
    why: 'needs a photo',
    // A scrim of at least 0.55 keeps white text at 4.5:1 even over a pure white photo.
    params: r => ({ anchor: pick(r, ['bottom-left', 'center', 'middle-left'] as const), scrim: round2(inRange(r, [0.58, 0.8])) }),
    features: p => [['bottom-left', 'center', 'middle-left'].indexOf(p.anchor) / 2, (p.scrim - 0.55) * 4],
    describe: p => `text ${p.anchor.replace('-', ' ')}, scrim ${pct(p.scrim)}`,
  },
  stacked: {
    label: 'Stacked',
    gate: () => true,
    why: '',
    params: (r, c) => ({
      align: pick(r, ['center', 'left'] as const),
      image: hasPhoto(c) ? pick(r, ['bleed', 'inset', 'none'] as const) : 'none',
      tone: tone(r),
    }),
    features: p => [p.align === 'center' ? 1 : 0, ['bleed', 'inset', 'none'].indexOf(p.image) / 2, toneFeature(p.tone)],
    describe: p => `${p.align === 'center' ? 'centred' : 'left aligned'}, image ${p.image}, ${p.tone} background`,
  },
  card: {
    label: 'Card on image',
    gate: hasPhoto,
    why: 'needs a photo',
    params: r => ({ pos: pick(r, ['left', 'center', 'right'] as const), surface: pick(r, ['surface', 'ground'] as const) }),
    features: p => [['left', 'center', 'right'].indexOf(p.pos) / 2, p.surface === 'surface' ? 1 : 0],
    describe: p => `card ${p.pos}, ${p.surface} card`,
  },
  offset: {
    label: 'Offset',
    gate: hasPhoto,
    why: 'needs a photo',
    // Rolled past the 25% limit on purpose: the overlap check rejects the excess.
    params: r => ({ overlap: round2(inRange(r, [0, 0.35])), drop: Math.round(inRange(r, [0, 70])) }),
    features: p => [p.overlap * 2.5, p.drop / 70],
    describe: p => `headline overlaps photo by ${pct(p.overlap)}, photo drops ${p.drop}px`,
  },
  typeled: {
    label: 'Type-led',
    gate: () => true,
    why: '',
    params: (r, c) => ({ trust: c.badges.length > 0 && r() < 0.7, scale: round2(inRange(r, [1.15, 1.4])), tone: tone(r) }),
    features: p => [p.trust ? 1 : 0, (p.scale - 1.15) * 4, toneFeature(p.tone)],
    describe: p => `display headline x${p.scale}, trust strip ${p.trust ? 'on' : 'off'}, ${p.tone} background`,
  },
  proof: {
    label: 'Proof-first',
    gate: c => reviewCount(c) >= 3,
    why: 'needs 3+ reviews',
    params: (r, c) => ({
      count: 1 + Math.floor(r() * Math.min(3, reviewCount(c))),
      summary: c.rating ? pick(r, ['top', 'bottom'] as const) : 'none',
      team: hasPhoto(c) && r() < 0.5,
      tone: tone(r),
    }),
    features: p => [p.count / 3, p.summary === 'top' ? 1 : p.summary === 'bottom' ? 0.5 : 0, p.team ? 1 : 0, toneFeature(p.tone)],
    describe: p => `${p.count} review card${p.count > 1 ? 's' : ''}, rating ${p.summary}, team photo ${p.team ? 'on' : 'off'}, ${p.tone} background`,
  },
  contact: {
    label: 'Contact panel',
    gate: c => c.quoteForm,
    why: 'needs an email for enquiries',
    params: r => ({ fields: 2 + Math.floor(r() * 3), side: pick(r, ['right', 'left'] as const), tone: tone(r) }),
    features: p => [p.fields / 4, p.side === 'right' ? 1 : 0, toneFeature(p.tone)],
    describe: p => `${p.fields}-field form on the ${p.side}, ${p.tone} background`,
  },
}

export const ARCHETYPE_KEYS = Object.keys(ARCHETYPES) as ArchetypeKey[]

/** Calls an archetype function with its own spec's params (TS can't correlate the union). */
export function forSpec<R>(spec: HeroSpec, fn: <K extends ArchetypeKey>(a: Archetype<K>, p: ParamsOf<K>) => R): R {
  return fn(ARCHETYPES[spec.archetype] as Archetype<typeof spec.archetype>, spec.params as ParamsOf<typeof spec.archetype>)
}

/** Used when a stored spec's content gate no longer holds (e.g. the photo was removed). */
export const FALLBACK_SPEC: HeroSpec = {
  v: 1, section: 'hero', archetype: 'stacked', params: { align: 'left', image: 'none', tone: 'ground' },
}
