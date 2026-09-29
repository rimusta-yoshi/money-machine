import { cx, esc, safeImageUrl, safeUrl } from '../html'
import type { PagePhoto } from '../content'
import type { SiteStyle } from '../schema'
import type { Break, Crop } from '../themes/types'
import { sizeVars, styleVars } from './vars'
import type { SectionKey, SectionRhythm, Step } from './types'

/** Decorative line icons (24px grid). The text beside each one carries the meaning. */
const PATHS = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-4.5"/>',
  star: '<path d="M12 3l2.5 6 6.5.5-5 4.5 1.5 6.5L12 17l-5.5 3.5 1.5-6.5-5-4.5L9.5 9z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
  wrench: '<path d="M14.5 3.5a4 4 0 0 0 5 5l-2 2 3 3-3 3-3-3-7 7a2.8 2.8 0 1 1-4-4l7-7-3-3 3-3 3 3 1.5-1.5z"/>',
  badge: '<path d="M12 2l3 3 4 .5.5 4 3 3-3 3-.5 4-4 .5-3 3-3-3-4-.5-.5-4-3-3 3-3 .5-4 4-.5z"/><path d="M9 12l2 2 4-4"/>',
  sparkle: '<path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
  chat: '<path d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H9l-5 4v-4H6a3 3 0 0 1-3-3z"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9z"/><circle cx="8" cy="8" r="1.5"/>',
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  drop: '<path d="M12 3c3 4 5.5 6.8 5.5 10a5.5 5.5 0 0 1-11 0C6.5 9.8 9 7 12 3z"/>',
  brush: '<path d="M4 20c2.5 0 4-1.5 4-4a2.5 2.5 0 0 0-5 0"/><path d="M8 15.5L19 4.5a1.8 1.8 0 0 1 2.5 2.5L10.5 18"/>',
  leaf: '<path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15"/><path d="M5 19l7-7"/>',
  roof: '<path d="M2.5 12L12 4l9.5 8"/><path d="M5 10.5V20h14v-9.5"/><path d="M10 20v-5h4v5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
} as const
export type IconName = keyof typeof PATHS

export const icon = (name: IconName, size = 20): string =>
  `<svg class="sb-icon" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`

export const titleId = (type: SectionKey): string => `sb-${type.replace('_', '-')}-title`

/**
 * A heading with its last phrase marked for emphasis (the theme draws it: accent colour,
 * italic, underline). Splits at the last sentence or clause break, else the last two words.
 */
export function emphasize(text: string, on: boolean): string {
  if (!on) return esc(text)
  const m = text.match(/^(.*[.,—–:!?])\s+(\S.*)$/)
  const words = text.split(' ')
  const [a, b] = m && m[2].split(' ').length <= 5 && m[1].length >= 6 ? [m[1], m[2]] : words.length >= 4 ? [words.slice(0, -2).join(' '), words.slice(-2).join(' ')] : [text, '']
  return b ? `${esc(a)} <span class="sb-em">${esc(b)}</span>` : esc(a)
}

export type HeadAlign = 'left' | 'center' | 'row'

interface HeadOpts {
  eyebrow?: string
  title: string
  lead?: string
  /** 'row': heading on the left, lead on the right. */
  align?: HeadAlign
  /** Keep the heading for screen readers only. */
  hidden?: boolean
  /** Mark the title's last phrase for the theme's emphasis. */
  em?: boolean
  /** A status dot before the eyebrow (Clean Pro). */
  dot?: boolean
  /** Draw the heading at the giant size (scale contrast). */
  big?: boolean
  cls?: string
}

/** The section heading block. Every section is named by its own h2. */
export function head(type: SectionKey, o: HeadOpts): string {
  const eyebrow = o.eyebrow ? `<p class="sb-eyebrow">${o.dot ? '<span class="sb-dot" aria-hidden="true"></span>' : ''}${esc(o.eyebrow)}</p>` : ''
  const h2 = `<h2 id="${titleId(type)}" class="${cx('sb-h2', o.big && 'sb-h2--big')}" data-heading>${emphasize(o.title, !!o.em)}</h2>`
  const lead = o.lead ? `<p class="sb-lead">${esc(o.lead)}</p>` : ''
  if (o.hidden) return `<div class="sb-sr">${h2}</div>`
  if (o.align === 'row') return `<div class="${cx('sb-head sb-head--row', o.cls)}"><div>${eyebrow}${h2}</div>${lead}</div>`
  return `<div class="${cx('sb-head', o.align === 'center' && 'sb-head--center', o.cls)}">${eyebrow}${h2}${lead}</div>`
}

interface ShellOpts {
  archetype: string
  step: Step
  cls?: string
  /** Page anchor, e.g. "contact" for the hero's quote link. */
  anchor?: string
  vars?: string
  tag?: 'section' | 'footer'
  brk?: Break
}

/** The outer element: theme, site style, type sizes at this step, band colours from the rhythm, image side, break. */
export function shell(type: SectionKey, style: SiteStyle, rhythm: SectionRhythm, o: ShellOpts, inner: string): string {
  const tag = o.tag ?? 'section'
  const labelled = tag === 'section' ? ` aria-labelledby="${titleId(type)}"` : ''
  const id = o.anchor ? ` id="${esc(o.anchor)}"` : ''
  const slug = type.replace('_', '-')
  const brk = o.brk ?? 'band'
  const cls = cx(
    'sb-sec', `sb-th--${style.theme}`, `sb-${slug}`, `sb-${slug}--${o.archetype}`, `sb-tone--${rhythm.band}`, `sb-img--${rhythm.side}`,
    `sb-brk--${brk}`, !rhythm.motif && 'sb-plain', o.cls,
  )
  const rule = brk === 'rule' ? '<div class="sb-rule-top" aria-hidden="true"></div>' : ''
  return `<${tag} class="${cls}"${id}${labelled} style="${esc(styleVars(style) + sizeVars(style, o.step) + (o.vars ?? ''))}"><div class="sb-wrap">${rule}${inner}</div></${tag}>`
}

/** The primary action, drawn in the site's button style. */
export const button = (style: SiteStyle, label: string, href: string, extra = ''): string =>
  `<a class="sb-btn sb-btn--${style.button}" href="${esc(safeUrl(href))}"${extra}>${esc(label)}</a>`

/** A secondary action: an outline in the text colour. */
export const ghost = (label: string, href: string, extra = ''): string =>
  `<a class="sb-btn sb-btn--ghost" href="${esc(safeUrl(href))}"${extra}>${esc(label)}</a>`

export const link = (label: string, href: string, cls = 'sb-link'): string =>
  `<a class="${cls}" href="${esc(safeUrl(href))}">${esc(label)}</a>`

const starText = (score: number) => '★'.repeat(Math.round(score)) + '☆'.repeat(5 - Math.round(score))
/** Stars that screen readers announce as "Rated 4.8 out of 5". */
export const stars = (score: number): string =>
  `<span class="sb-stars" role="img" aria-label="Rated ${esc(score)} out of 5">${starText(score)}</span>`

/** A photo from the record, or nothing if its URL isn't one we allow. */
export function img(photo: PagePhoto | null | undefined, cls = 'sb-photo', loading: 'lazy' | 'eager' = 'lazy'): string {
  const src = photo ? safeImageUrl(photo.url) : ''
  if (!photo || !src) return ''
  return `<div class="${cls}"><img src="${esc(src)}" alt="${esc(photo.alt)}" loading="${loading}" decoding="async"></div>`
}

export type Corner = 'tl' | 'tr' | 'bl' | 'br'
export const CORNERS: readonly Corner[] = ['tl', 'tr', 'bl', 'br']

export interface Sticker { text: string; ink?: boolean; at: Corner }

/** Decorations a photo frame can carry. Overlays are marked data-over for the "covers text" check. */
export interface Frame {
  crop: Crop | 'fill'
  /** A hazard stripe block off one corner (Workwear). */
  stripe?: Corner
  /** A soft blob behind the photo (Friendly Local). */
  blob?: boolean
  /** Rotated stickers over the photo's edges (Friendly Local). */
  stickers?: readonly Sticker[]
  rot?: number
  /** A floating card over one corner (Clean Pro): inner HTML, already escaped. */
  float?: { html: string; at: Corner }
  /** An italic caption under the photo (Craft Heritage); duplicates the alt text, so hidden from screen readers. */
  caption?: string
  cls?: string
}

/** A photo in the theme's frame, with whichever decorations the spec and rhythm allow. */
export function media(photo: PagePhoto | null | undefined, f: Frame, loading: 'lazy' | 'eager' = 'lazy'): string {
  const picture = img(photo, 'sb-photo', loading)
  if (!picture) return ''
  const crop = f.crop === 'fill' ? 'fill' : f.crop.replace(':', 'x')
  const blob = f.blob ? '<div class="sb-blob" aria-hidden="true"></div>' : ''
  const stripe = f.stripe ? `<span class="sb-stripe sb-at--${f.stripe}" data-over aria-hidden="true"></span>` : ''
  const stickers = (f.stickers ?? []).map((s, i) => {
    const deg = (f.rot ?? 0) * (i % 2 === 0 ? 1 : -1)
    return `<p class="${cx('sb-sticker', s.ink && 'sb-sticker--ink', `sb-at--${s.at}`)}" data-over style="--sb-rot:${deg}deg">${esc(s.text)}</p>`
  }).join('')
  const float = f.float ? `<div class="sb-float sb-at--${f.float.at}" data-over>${f.float.html}</div>` : ''
  const caption = f.caption ? `<p class="sb-cap" aria-hidden="true">${esc(f.caption)}</p>` : ''
  return `<div class="${cx('sb-media', `sb-crop--${crop}`, f.cls)}">${blob}${picture}${stripe}${stickers}${float}${caption}</div>`
}

export const list = (items: readonly string[], cls: string, item: (s: string, i: number) => string, tag: 'ul' | 'ol' = 'ul'): string =>
  items.length ? `<${tag} class="${cls}">${items.map((s, i) => `<li>${item(s, i)}</li>`).join('')}</${tag}>` : ''

/** The theme's ornamental divider (hazard stripe, diamond, short rule, pill). Decorative. */
export const divider = (): string => '<div class="sb-divider" aria-hidden="true"><span></span></div>'
