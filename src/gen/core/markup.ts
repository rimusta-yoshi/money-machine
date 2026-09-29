import { cx, esc, safeImageUrl, safeUrl } from '../html'
import { styleVars } from './vars'
import type { ButtonStyle, SiteStyle } from '../schema'
import type { PagePhoto } from '../content'
import type { SectionKey, SectionRhythm } from './types'
import { sectionVars } from './fit'

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
} as const
export type IconName = keyof typeof PATHS

export const icon = (name: IconName, size = 20): string =>
  `<svg class="sb-icon" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`

export const titleId = (type: SectionKey): string => `sb-${type.replace('_', '-')}-title`

interface HeadOpts {
  eyebrow?: string
  title: string
  lead?: string
  /** Keep the heading for screen readers only. */
  hidden?: boolean
  cls?: string
}

/** The section heading block. Every section is named by its own h2. */
export function head(type: SectionKey, o: HeadOpts): string {
  const eyebrow = o.eyebrow ? `<p class="sb-eyebrow">${esc(o.eyebrow)}</p>` : ''
  const lead = o.lead ? `<p class="sb-lead">${esc(o.lead)}</p>` : ''
  return `<div class="${cx(o.hidden ? 'sb-sr' : 'sb-head', o.cls)}">${eyebrow}<h2 id="${titleId(type)}" class="sb-h2" data-heading>${esc(o.title)}</h2>${lead}</div>`
}

interface ShellOpts {
  archetype: string
  cls?: string
  /** Page anchor, e.g. "contact" for the hero's quote link. */
  anchor?: string
  vars?: string
  tag?: 'section' | 'footer'
}

/** The outer element: site style, band colours from the rhythm, and the image side. */
export function shell(type: SectionKey, style: SiteStyle, rhythm: SectionRhythm, o: ShellOpts, inner: string): string {
  const tag = o.tag ?? 'section'
  const labelled = tag === 'section' ? ` aria-labelledby="${titleId(type)}"` : ''
  const id = o.anchor ? ` id="${esc(o.anchor)}"` : ''
  const cls = cx('sb-sec', `sb-${type.replace('_', '-')}`, `sb-${type.replace('_', '-')}--${o.archetype}`, `sb-tone--${rhythm.band}`, `sb-img--${rhythm.side}`, o.cls)
  return `<${tag} class="${cls}"${id}${labelled} style="${esc(styleVars(style) + sectionVars(style) + (o.vars ?? ''))}"><div class="sb-wrap">${inner}</div></${tag}>`
}

/** Forms can't use an underline "button": it doesn't read as a submit control. */
export const solidish = (b: ButtonStyle): ButtonStyle => (b === 'underline' ? 'solid' : b)

export const button = (style: ButtonStyle, label: string, href: string, extra = ''): string =>
  `<a class="sb-btn sb-btn--${style}" href="${esc(safeUrl(href))}"${extra}>${esc(label)}</a>`

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

export const list = (items: readonly string[], cls: string, item: (s: string, i: number) => string): string =>
  items.length ? `<ul class="${cls}">${items.map((s, i) => `<li>${item(s, i)}</li>`).join('')}</ul>` : ''
