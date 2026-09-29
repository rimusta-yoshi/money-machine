import { z } from 'zod'
import { cx, esc, safeImageUrl } from '../html'
import { pick } from '../rng'
import type { PageContent, PagePhoto } from '../content'
import { defineSection, specSchema } from '../core/define'
import type { BodyContext } from '../core/define'
import { head, img } from '../core/markup'
import { rollBreak, rollCrop, rollMotif, rollRot } from '../core/punch'
import { THEMES } from '../themes'
import { BREAKS, CROPS, MOTIFS } from '../themes/types'

export interface GalleryView { photos: readonly PagePhoto[] }
export const galleryView = (c: PageContent): GalleryView => ({ photos: c.photos.gallery })

export const gallerySchema = specSchema('gallery', {
  grid: { cols: z.union([z.literal(2), z.literal(3)]), crop: z.enum(CROPS), brk: z.enum(BREAKS) },
  mosaic: { wide: z.enum(['first', 'last']), brk: z.enum(BREAKS) },
  strip: { size: z.enum(['medium', 'large']) },
  feature: { thumbs: z.union([z.literal(3), z.literal(4)]), brk: z.enum(BREAKS) },
  slab: { cols: z.union([z.literal(3), z.literal(4)]), motif: z.enum(MOTIFS) },
  captioned: { cols: z.union([z.literal(2), z.literal(3)]), stagger: z.boolean(), motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
  polaroids: { rot: z.number().int().min(-6).max(6), motif: z.enum(MOTIFS) },
})
export type GallerySpec = z.infer<typeof gallerySchema>

const HEAD = (ctx: BodyContext, align: 'left' | 'center' | 'row' = 'left') =>
  head('gallery', { eyebrow: ctx.biome.voice.eyebrows.gallery, title: ctx.biome.voice.titles.gallery, align })
const cell = (p: PagePhoto, cls = '') => `<li class="sb-gal-cell${cls}">${img(p, 'sb-photo')}</li>`

/** A photo with a caption from its description. The caption repeats the alt text, so it is hidden from screen readers. */
function figure(p: PagePhoto, extra = ''): string {
  const src = safeImageUrl(p.url)
  if (!src) return ''
  return `<li class="sb-gal-fig"${extra}><div class="sb-photo"><img src="${esc(src)}" alt="${esc(p.alt)}" loading="lazy" decoding="async"></div><p class="sb-cap" aria-hidden="true">${esc(p.alt)}</p></li>`
}

export const gallery = defineSection<GallerySpec, GalleryView>({
  type: 'gallery',
  label: 'Gallery',
  view: galleryView,
  schema: gallerySchema,
  anchor: 'work',
  archetypes: {
    grid: {
      label: 'Grid', why: 'needs 3+ photos of your work',
      gate: v => v.photos.length >= 3,
      params: (r, { content: v, biome: t }) => ({ cols: v.photos.length % 3 === 0 ? 3 : pick(r, [2, 3] as const), crop: rollCrop(r, t), brk: rollBreak(r, t, ['band', 'rule', 'panel']) }),
      features: p => [p.cols - 2, CROPS.indexOf(p.crop) / 3, BREAKS.indexOf(p.brk) / 2],
      focal: (_p, z) => ({ focal: z.h2, second: 17 }),
    },
    mosaic: {
      label: 'Mosaic', why: 'needs 3+ photos of your work',
      gate: v => v.photos.length >= 3,
      params: (r, { biome: t }) => ({ wide: pick(r, ['first', 'last'] as const), brk: rollBreak(r, t, ['band', 'rule']) }),
      features: p => [p.wide === 'first' ? 1 : 0, 1],
      focal: (_p, z) => ({ focal: z.h2, second: 17 }),
    },
    strip: {
      label: 'Scrolling strip', why: 'needs a photo of your work',
      gate: v => v.photos.length >= 1,
      params: r => ({ size: pick(r, ['medium', 'large'] as const) }),
      features: p => [p.size === 'large' ? 1 : 0, 0.5],
      focal: (_p, z) => ({ focal: z.h2, second: 17 }),
    },
    feature: {
      label: 'Feature and thumbnails', why: 'needs 4+ photos of your work',
      gate: v => v.photos.length >= 4,
      params: (r, { content: v, biome: t }) => ({ thumbs: v.photos.length >= 5 ? pick(r, [3, 4] as const) : 3, brk: rollBreak(r, t, ['band', 'rule']) }),
      features: p => [p.thumbs === 4 ? 1 : 0, 0.5, 1],
      focal: (_p, z) => ({ focal: z.h2, second: 17 }),
      sided: true,
    },
    slab: {
      label: 'Edge to edge', why: 'needs 3+ photos of your work',
      gate: v => v.photos.length >= 3,
      params: (r, { content: v, biome: t }) => ({ cols: v.photos.length % 4 === 0 ? 4 : 3, motif: rollMotif(r, t, 'gallery', ['stripe'], 0.35) }),
      features: p => [p.cols - 3, p.motif === 'stripe' ? 1 : 0, 1],
      focal: (_p, z) => ({ focal: z.h2, second: 17 }),
    },
    captioned: {
      label: 'Captioned photos', why: 'needs 2+ photos of your work',
      gate: v => v.photos.length >= 2,
      params: (r, { content: v, biome: t }) => ({
        cols: v.photos.length % 3 === 0 ? pick(r, [3, 2] as const) : 2, stagger: r() < 0.6, motif: rollMotif(r, t, 'gallery', ['caption'], 0.1), brk: rollBreak(r, t, ['band', 'rule']),
      }),
      features: p => [p.cols - 2, p.stagger ? 1 : 0, 1],
      focal: (_p, z) => ({ focal: z.h2, second: 17 }),
    },
    polaroids: {
      label: 'Pinned photos', why: 'needs 2+ photos of your work',
      gate: v => v.photos.length >= 2,
      params: (r, { biome: t }) => ({ rot: rollRot(r, t), motif: rollMotif(r, t, 'gallery', ['sticker'], 0.5) }),
      features: p => [Math.abs(p.rot) / 6, p.motif === 'sticker' ? 1 : 0, 1],
      focal: (_p, z) => ({ focal: z.h2, second: 17 }),
    },
  },
  weights: {
    'workwear': { grid: 2, mosaic: 1.6, strip: 1.6, feature: 1.4, slab: 3 },
    'clean-pro': { grid: 3, mosaic: 2, strip: 1.6, feature: 2.4 },
    'craft-heritage': { grid: 1.6, mosaic: 1, strip: 1, feature: 2, captioned: 3.5 },
    'friendly-local': { grid: 2.4, mosaic: 2.4, strip: 1.4, feature: 1, polaroids: 3.5 },
  },
  fallback: { v: 2, section: 'gallery', archetype: 'strip', step: 2, params: { size: 'medium' } },
  body: (s, v, ctx) => {
    switch (s.archetype) {
      case 'grid': {
        const p = s.params
        return { cls: `sb-crop--${p.crop.replace(':', 'x')}`, vars: `--sb-cols:${p.cols};--sb-cols-m:2;`, inner: `${HEAD(ctx, 'row')}<ul class="sb-grid sb-gal">${v.photos.map(x => cell(x)).join('')}</ul>` }
      }
      case 'mosaic': {
        const wideAt = s.params.wide === 'first' ? 0 : v.photos.length - 1
        return { inner: `${HEAD(ctx)}<ul class="sb-gal-mosaic">${v.photos.map((x, i) => cell(x, i === wideAt ? ' sb-gal-wide' : '')).join('')}</ul>` }
      }
      case 'strip':
        return {
          cls: `sb-size--${s.params.size}`,
          inner: `${HEAD(ctx, 'row')}<ul class="sb-gal-strip" data-scroll tabindex="0" aria-label="Project photos, scroll sideways for more">${v.photos.map(x => cell(x)).join('')}</ul>`,
        }
      case 'feature': {
        const [first, ...rest] = v.photos
        const thumbs = rest.slice(0, s.params.thumbs)
        const more = rest.slice(s.params.thumbs)
        return {
          vars: '--sb-ta:5;',
          inner: `${HEAD(ctx)}<div class="sb-cols sb-cols--top sb-gal-feature"><ul class="sb-main sb-gal-thumbs">${thumbs.map(x => cell(x)).join('')}</ul>${img(first, 'sb-photo sb-aside sb-media sb-gal-big')}</div>`
            + (more.length ? `<ul class="sb-grid sb-gal" style="--sb-cols:4;--sb-cols-m:2">${more.map(x => cell(x)).join('')}</ul>` : ''),
        }
      }
      case 'slab': {
        const p = s.params
        const stripe = ctx.motif ? '<div class="sb-divider sb-gal-stripe" aria-hidden="true"><span></span></div>' : ''
        return { vars: `--sb-cols:${p.cols};--sb-cols-m:2;`, inner: `${HEAD(ctx, 'row')}${stripe}<ol class="sb-gal-slab">${v.photos.map(x => cell(x)).join('')}</ol>` }
      }
      case 'captioned': {
        const p = s.params
        return { cls: cx(p.stagger && 'sb-gal-stagger'), vars: `--sb-cols:${p.cols};--sb-cols-m:1;`, inner: `${HEAD(ctx, 'center')}<ul class="sb-grid sb-gal-figs">${v.photos.slice(0, 6).map(x => figure(x)).join('')}</ul>` }
      }
      case 'polaroids': {
        const p = s.params
        const pins = v.photos.slice(0, 6).map((x, i) => figure(x, ` data-over style="--sb-rot:${i % 2 === 0 ? p.rot : -p.rot}deg"`)).join('')
        return { inner: `${HEAD(ctx, 'center')}<ul class="sb-gal-pins">${pins}</ul>` }
      }
    }
  },
  words: (_s, _v, style) => ({ title: THEMES[style.theme].voice.titles.gallery, texts: [] }),
})

export const GALLERY_CSS = `
.sb-gal-cell .sb-photo{width:100%;height:100%}
.sb-gal .sb-gal-cell{aspect-ratio:4/3}
.sb-crop--1x1 .sb-gal .sb-gal-cell{aspect-ratio:1/1}
.sb-crop--4x5 .sb-gal .sb-gal-cell{aspect-ratio:4/5}
.sb-crop--3x2 .sb-gal .sb-gal-cell{aspect-ratio:3/2}
.sb-gal-mosaic{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-rows:230px;gap:calc(var(--sb-gap) * 0.9)}
.sb-gal-wide{grid-column:span 2;grid-row:span 2}
.sb-gal-strip .sb-gal-cell{aspect-ratio:4/3}
.sb-size--large .sb-gal-strip{grid-auto-columns:minmax(320px,46%)}
.sb-gal-big{aspect-ratio:4/3;width:100%}
.sb-gal-thumbs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:calc(var(--sb-gap) * 0.9)}
.sb-gal-thumbs .sb-gal-cell{aspect-ratio:4/3}
.sb-gal-slab{display:grid;grid-template-columns:repeat(var(--sb-cols),minmax(0,1fr));gap:0;counter-reset:sb-n;margin:0 calc(-1 * (var(--sb-pad) + (100cqw - min(100cqw, 1200px)) / 2))}
.sb-gal-slab>li{position:relative;counter-increment:sb-n;aspect-ratio:1/1}
.sb-gal-slab>li::after{content:counter(sb-n,decimal-leading-zero);position:absolute;left:0;top:0;z-index:2;padding:6px 12px;background:var(--sb-accent);color:var(--sb-bg);font-family:var(--sb-fd);font-size:28px;line-height:1}
.sb-gal-slab .sb-photo{border-radius:0}
.sb-gal-stripe{width:100%}
.sb-gal-figs{row-gap:calc(var(--sb-gap) * 2.5)}
.sb-gal-fig{display:flex;flex-direction:column;gap:12px}
.sb-gal-fig .sb-photo{aspect-ratio:4/3}
.sb-gal-stagger .sb-gal-figs>li:nth-child(even){margin-top:calc(var(--sb-gap) * 5)}
.sb-gal-pins{display:flex;flex-wrap:wrap;justify-content:center;gap:40px 34px;padding:12px 0 20px}
.sb-gal-pins>li{width:min(300px,42%);padding:14px 14px 18px;background:#FFFFFF;color:var(--sb-ink);box-shadow:0 12px 28px color-mix(in srgb,var(--sb-ink) 14%,transparent);transform:rotate(var(--sb-rot,0deg))}
.sb-gal-pins .sb-photo{border-radius:calc(var(--sb-r) * 0.4)}
.sb-gal-pins .sb-cap{color:var(--sb-muted);font-weight:700;font-size:15px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
@container (max-width: 719px){
  .sb-gal-mosaic{grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:140px}
  .sb-gal-wide{grid-column:span 2;grid-row:span 1}
  .sb-size--large .sb-gal-strip{grid-auto-columns:88%}
  .sb-gal-slab{margin:0 -20px;grid-template-columns:repeat(2,minmax(0,1fr))}
  .sb-gal-slab>li::after{font-size:20px}
  .sb-gal-stagger .sb-gal-figs>li:nth-child(even){margin-top:0}
  .sb-gal-pins{gap:24px}
  .sb-gal-pins>li{width:78%}
}
`
