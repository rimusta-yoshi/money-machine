import type { ButtonStyle, Palette, ThemeKey } from '../schema'
import type { SectionKey } from '../core/types'

/**
 * A theme is a biome: a complete design language, not a colour swap. Everything a
 * generated option may do in a theme is written down here; anything outside these
 * lists and ranges can't be generated, and a stored spec that strays outside fails
 * the theme check (so fit repair moves it back in).
 */

export type Fallback = 'sans-serif' | 'serif'

export interface Face { family: string; weight: number; fallback: Fallback }

/** Three designed sizes, largest first: a section shrinks along these (its `step`) to fit. */
export type Ladder = readonly [number, number, number]

/**
 * One designed type scale, in px. Desktop and phone sizes are set together and never
 * interpolated; display sizes come as a short ladder so a heading can shrink to fit
 * without leaving the preset.
 */
export interface TypePreset {
  label: string
  h1: Ladder; h1m: Ladder
  h2: Ladder; h2m: Ladder
  /** Giant focal elements: a phone number, a pull quote, a big stat. */
  xl: Ladder; xlm: Ladder
  h3: number
  lead: number
}

/* ---- punch parameters: the values a theme allows ---- */

export const ASYMS = ['6/6', '7/5', '5/7', '8/4', '4/8'] as const
export type Asym = typeof ASYMS[number]
export const ALIGNS = ['left', 'center', 'split'] as const
export type Align = typeof ALIGNS[number]
export const CROPS = ['4:5', '1:1', '4:3', '3:2'] as const
export type Crop = typeof CROPS[number]
export const BLEEDS = ['none', 'edge'] as const
export type Bleed = typeof BLEEDS[number]
/** How a section meets its neighbours: a full-width band, an inset panel, or a rule line. */
export const BREAKS = ['band', 'panel', 'rule'] as const
export type Break = typeof BREAKS[number]

export const MOTIFS = [
  'none',
  // Workwear
  'stripe', 'numbers', 'toprule', 'bigphone',
  // Clean Pro
  'floatcard', 'icontile', 'dot', 'ticks',
  // Craft Heritage
  'double', 'leaders', 'caption', 'diamond',
  // Friendly Local
  'blob', 'sticker', 'pastel', 'bubble', 'circles',
] as const
export type Motif = typeof MOTIFS[number]

export interface Punch {
  /** Rotation in degrees for stickers and pinned photos; [0, 0] means nothing ever rotates. */
  rotation: readonly [number, number]
  asym: readonly Asym[]
  align: readonly Align[]
  crop: readonly Crop[]
  bleed: readonly Bleed[]
  breaks: readonly Break[]
}

/** When a motif may appear: which sections, how often per page, and whether neighbours may repeat it. */
export interface MotifRule {
  label: string
  sections: readonly SectionKey[]
  maxPerPage: number
  /** Never on two sections in a row. */
  apart?: boolean
}

/** Suggested lines only. Never facts: nothing here claims a rating, a year, a licence or a guarantee. */
export interface Voice {
  eyebrows: Partial<Record<SectionKey, string>>
  titles: {
    services: string
    whyUs: string
    gallery: string
    certifications: string
    reviews: string
    /** "Covering Leeds" style; gets the place or a generic fallback. */
    areas: (place: string) => string
    about: (trade: string, place: string) => string
    /** Contact heading, from the trade name (e.g. "Need a plumber?"). */
    contact: (trade: string, cta: string) => string
  }
  /** Five working promises for the why-us section: how the business works, not what it has. */
  why: readonly (readonly [string, string])[]
  cta: {
    call: (phone: string) => string
    /** A short call label for tight spots (the phone number stays visible nearby). */
    callShort: string
    send: string
  }
}

export interface Neutrals {
  ground: string
  surface: string
  line: string
  ink: string
  muted: string
}

export interface Biome {
  key: ThemeKey
  label: string
  /** One line for the theme picker. */
  blurb: string
  fonts: { display: Face; body: Face; label: Face }
  display: { upper: boolean; tracking: number; leading: number }
  /** Eyebrows, buttons and small caps labels. */
  caps: { upper: boolean; tracking: number }
  /** Card titles use the display face or the label face. */
  h3: 'display' | 'label'
  /** Largest first. The site rolls a base preset; a section may step down from it to fit. */
  scales: readonly [TypePreset, TypePreset, TypePreset]
  scaleWeights: readonly [number, number, number]
  /** Ground variants the site style can roll. */
  grounds: readonly Neutrals[]
  /** Builds the contrast-safe palette around the customer's brand colour. */
  palette: (brand: string, n: Neutrals) => Palette
  buttons: Partial<Record<ButtonStyle, number>>
  radius: readonly [number, number]
  density: readonly [number, number]
  punch: Punch
  motifs: Partial<Record<Exclude<Motif, 'none'>, MotifRule>>
  /** How many sections may carry the loud brand band, and in which order of preference. */
  loud: { max: number; priority: readonly SectionKey[] }
  voice: Voice
  /**
   * Whether cards are filled panels that reset text to ink (and so get their own contrast
   * checks on ground, surface and every tint), or open shapes (rules, outlines) whose
   * text keeps the band's colours.
   */
  cards: 'filled' | 'open'
  /** Component skin: buttons, cards, eyebrows, dividers, lists, photo frames, fields, header. */
  css: string
}
