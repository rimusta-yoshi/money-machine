import type { Pack } from '../../packs'

/** Where the "Websites for…" pages live. */
export const HUB_PATH = '/websites-for/'
export const typePath = (p: Pick<Pack, 'slug'>): string => `${HUB_PATH}${p.slug}/`
/** One of a type's three example sites (n from 0). */
export const examplePath = (p: Pick<Pack, 'slug'>, n: number): string => `${typePath(p)}example-${n + 1}/`
/** The example's screenshot and the page's link-preview image (made by npm run pack:images, under public/). */
export const exampleShot = (p: Pick<Pack, 'slug'>, n: number): string => `${typePath(p)}example-${n + 1}.jpg`
export const ogImage = (p: Pick<Pack, 'slug'>): string => `/og/${p.slug}.png`
/**
 * Sample photos the examples show, copied into the build. At /photos/ because the generator
 * only shows images from https, data URLs or a site's own /photos/ folder.
 */
export const PHOTO_PATH = '/photos/'
/** The builder with this trade already picked. */
export const startPath = (p: Pick<Pack, 'id'>): string => `/build/?trade=${p.id}`
