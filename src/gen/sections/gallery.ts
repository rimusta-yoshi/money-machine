import { z } from 'zod'
import { pick } from '../rng'
import type { PageContent, PagePhoto } from '../content'
import { defineSection, specSchema } from '../core/define'
import { head, img } from '../core/markup'

export interface GalleryView { photos: readonly PagePhoto[] }
export const galleryView = (c: PageContent): GalleryView => ({ photos: c.photos.gallery })

const TITLE = 'Recent projects'
const HEAD = head('gallery', { eyebrow: 'Our work', title: TITLE })

export const gallerySchema = specSchema('gallery', {
  grid: { cols: z.union([z.literal(2), z.literal(3)]), shape: z.enum(['square', 'landscape']) },
  mosaic: { wide: z.enum(['first', 'last']) },
  strip: { size: z.enum(['medium', 'large']) },
  feature: { thumbs: z.union([z.literal(3), z.literal(4)]) },
})
export type GallerySpec = z.infer<typeof gallerySchema>

const cell = (p: PagePhoto, cls = '') => `<li class="sb-gal-cell${cls}">${img(p, 'sb-photo')}</li>`

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
      params: (r, v) => ({ cols: v.photos.length % 3 === 0 ? 3 : pick(r, [2, 3] as const), shape: pick(r, ['square', 'landscape'] as const) }),
      features: p => [p.cols === 3 ? 1 : 0, p.shape === 'square' ? 1 : 0],
    },
    mosaic: {
      label: 'Mosaic', why: 'needs 3+ photos of your work',
      gate: v => v.photos.length >= 3,
      params: r => ({ wide: pick(r, ['first', 'last'] as const) }),
      features: p => [p.wide === 'first' ? 1 : 0],
    },
    strip: {
      label: 'Scrolling strip', why: 'needs a photo of your work',
      gate: v => v.photos.length >= 1,
      params: r => ({ size: pick(r, ['medium', 'large'] as const) }),
      features: p => [p.size === 'large' ? 1 : 0],
    },
    feature: {
      label: 'Feature and thumbnails', why: 'needs 4+ photos of your work',
      gate: v => v.photos.length >= 4,
      params: (r, v) => ({ thumbs: v.photos.length >= 5 ? pick(r, [3, 4] as const) : 3 }),
      features: p => [p.thumbs === 4 ? 1 : 0],
      sided: true,
    },
  },
  weights: {
    professional: { grid: 3, mosaic: 1.5, strip: 1.5, feature: 2 },
    luxury: { grid: 1.5, mosaic: 2.5, strip: 2, feature: 3 },
    family: { grid: 2.5, mosaic: 3, strip: 2, feature: 1.5 },
    brutalism: { grid: 3, mosaic: 1, strip: 2.5, feature: 1.5 },
  },
  fallback: { v: 1, section: 'gallery', archetype: 'strip', params: { size: 'medium' } },
  cards: () => false,
  body: (s, _style, v) => {
    switch (s.archetype) {
      case 'grid':
        return { cls: `sb-shape--${s.params.shape}`, vars: `--sb-cols:${s.params.cols};--sb-cols-m:2;`, inner: `${HEAD}<ul class="sb-grid sb-gal">${v.photos.map(p => cell(p)).join('')}</ul>` }
      case 'mosaic': {
        const wideAt = s.params.wide === 'first' ? 0 : v.photos.length - 1
        return { inner: `${HEAD}<ul class="sb-gal-mosaic">${v.photos.map((p, i) => cell(p, i === wideAt ? ' sb-gal-wide' : '')).join('')}</ul>` }
      }
      case 'strip':
        return {
          cls: `sb-size--${s.params.size}`,
          inner: `${HEAD}<ul class="sb-gal-strip" data-scroll tabindex="0" aria-label="Project photos, scroll sideways for more">${v.photos.map(p => cell(p)).join('')}</ul>`,
        }
      case 'feature': {
        const [first, ...rest] = v.photos
        const thumbs = rest.slice(0, s.params.thumbs)
        const more = rest.slice(s.params.thumbs)
        return {
          inner: `${HEAD}<div class="sb-split sb-split--top sb-gal-feature"><ul class="sb-gal-thumbs">${thumbs.map(p => cell(p)).join('')}</ul>${img(first, 'sb-photo sb-side-media sb-gal-big', 'lazy')}</div>${more.length ? `<ul class="sb-grid sb-gal" style="--sb-cols:4;--sb-cols-m:2">${more.map(p => cell(p)).join('')}</ul>` : ''}`,
        }
      }
    }
  },
  words: () => ({ title: TITLE, texts: [] }),
})

export const GALLERY_CSS = `
.sb-gal-cell .sb-photo{width:100%;height:100%}
.sb-gal .sb-gal-cell{aspect-ratio:4/3}
.sb-shape--square .sb-gal .sb-gal-cell{aspect-ratio:1/1}
.sb-gal-mosaic{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-rows:220px;gap:calc(var(--sb-gap) * 0.75)}
.sb-gal-wide{grid-column:span 2;grid-row:span 2}
.sb-gal-strip .sb-gal-cell{aspect-ratio:4/3}
.sb-size--large .sb-gal-strip{grid-auto-columns:minmax(320px,46%)}
.sb-gal-big{aspect-ratio:4/3;width:100%}
.sb-gal-thumbs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:calc(var(--sb-gap) * 0.75)}
.sb-gal-thumbs .sb-gal-cell{aspect-ratio:4/3}
@container (max-width: 719px){
  .sb-gal-mosaic{grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:140px}
  .sb-gal-wide{grid-column:span 2;grid-row:span 1}
  .sb-size--large .sb-gal-strip{grid-auto-columns:88%}
}
`
