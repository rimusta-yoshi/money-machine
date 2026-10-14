import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { BRAND } from './src/brand/config'
import { PAGE_PACKS } from './src/packs/pages'
import type { PagePack } from './src/packs/pages'
import { HOME_OG_IMAGE, ICON_LINKS, socialTags } from './src/pages/html'
import { notFoundBody, notFoundHead } from './src/pages/notFound'
import { exampleFiles } from './src/pages/types/exampleSite'
import { hubBody, hubHead } from './src/pages/types/hub'
import { HUB_PATH, PHOTO_PATH, typePath } from './src/pages/types/paths'
import { typePageBody, typePageHead } from './src/pages/types/typePage'

/**
 * The pages built from the business-type packs (src/packs), plus the icons and the 404 page:
 * - /websites-for/ (the hub, a real entry: websites-for/index.html) and one page per pack at
 *   /websites-for/<slug>/, built from the hub's finished HTML so they share its stylesheet
 *   and script. No entry file per type: adding a pack adds its page.
 * - Each pack's three example sites (/websites-for/<slug>/example-<n>/), rendered by the real
 *   generator at build time, and the sample photos they show.
 * - /404.html from src/pages/notFound.ts, the icon links on every page, the homepage's link
 *   preview and the web app manifest.
 * The dev server serves the same pages from memory.
 */

const file = (path: string) => fileURLToPath(new URL(path, import.meta.url))
const PHOTOS = file('./reference/sample-photos/')
const PUBLIC = file('./public/')

const HEAD = /<!--wf:head-->[\s\S]*?<!--\/wf:head-->/
const BODY = /<!--wf:body-->[\s\S]*?<!--\/wf:body-->/
const marked = (head: string, body: string) => ({ head: `<!--wf:head-->${head}<!--/wf:head-->`, body: `<!--wf:body-->${body}<!--/wf:body-->` })
const fill = (html: string, head: string, body: string) => {
  const m = marked(head, body)
  return html.replace('<!--page-head-->', m.head).replace('<!--page-body-->', m.body)
}

interface Options { origin: string; pricePence: number }

const typeOptions = (o: Options) => ({ ...o, hasShot: (path: string) => existsSync(`${PUBLIC}${path.slice(1)}`) })
const packAt = (path: string): PagePack | undefined => PAGE_PACKS.find(p => path === typePath(p) || path === `${typePath(p)}index.html`)

/** A type page from the hub's HTML (with the hub's content swapped out). */
function typePageFrom(hubHtml: string, pack: PagePack, o: Options): string {
  const m = marked(typePageHead(pack, typeOptions(o)), typePageBody(pack, typeOptions(o)))
  if (!HEAD.test(hubHtml) || !BODY.test(hubHtml)) throw new Error('websites-for/index.html lost its <!--page-head--> or <!--page-body--> marker')
  return hubHtml.replace(HEAD, () => m.head).replace(BODY, () => m.body)
}

/** Every example site's files, and the sample photos they use. */
function allExamples(o: Options, date: Date): { files: Record<string, string>; photos: Set<string> } {
  const files: Record<string, string> = {}
  const photos = new Set<string>()
  for (const pack of PAGE_PACKS) for (const n of [0, 1, 2]) {
    const ex = exampleFiles(pack, n, o.origin, date)
    Object.assign(files, ex.files)
    ex.photos.forEach(p => photos.add(p))
  }
  return { files, photos }
}

/** The homepage's canonical link and link preview, from its own title and description. */
function homeSocial(origin: string, html: string): string {
  const title = (/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? BRAND.name).replace('%BRAND_NAME%', BRAND.name)
  const description = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? ''
  return socialTags({ title, description, url: `${origin}/`, image: HOME_OG_IMAGE, imageAlt: `${BRAND.name}: websites for tradespeople` }, origin)
}

const TYPES: Record<string, string> = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8' }

/** The web app manifest (for "Add to home screen"), named from the brand config. */
const MANIFEST = JSON.stringify({
  name: BRAND.name,
  short_name: BRAND.name,
  icons: [192, 512].map(n => ({ src: `/icon-${n}.png`, sizes: `${n}x${n}`, type: 'image/png' })),
  theme_color: '#1C1A24',
  background_color: '#FFFFFF',
  display: 'browser',
}, null, 2)

export function typePages(o: Options): Plugin {
  let examples: Record<string, string> | null = null
  return {
    name: 'type-pages',
    transformIndexHtml: {
      order: 'pre',
      handler: (html, ctx) => {
        const withIcons = html.replace('<link rel="icon" type="image/svg+xml" href="/favicon.svg" />', ICON_LINKS)
        const path = (ctx.originalUrl ?? ctx.path).split('?')[0]
        const pack = packAt(path)
        if (pack) return fill(withIcons, typePageHead(pack, typeOptions(o)), typePageBody(pack, typeOptions(o)))
        if (ctx.path === `${HUB_PATH}index.html` || path === HUB_PATH) return fill(withIcons, hubHead(o.origin), hubBody(o.pricePence))
        if (ctx.path === '/404.html') return fill(withIcons, notFoundHead(), notFoundBody())
        if (ctx.path === '/index.html') return withIcons.replace('</head>', `  ${homeSocial(o.origin, withIcons)}\n  </head>`)
        return withIcons
      },
    },
    configureServer: server => {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0]
        if (url === '/site.webmanifest') {
          res.setHeader('Content-Type', 'application/manifest+json')
          res.end(MANIFEST)
          return
        }
        if (url.startsWith(PHOTO_PATH)) {
          const name = url.slice(PHOTO_PATH.length)
          if (!/^[a-z0-9-]+\.jpg$/.test(name) || !existsSync(`${PHOTOS}${name}`)) return next()
          res.setHeader('Content-Type', 'image/jpeg')
          createReadStream(`${PHOTOS}${name}`).pipe(res)
          return
        }
        if (packAt(url)) {
          server.transformIndexHtml(url, readFileSync(file('./websites-for/index.html'), 'utf8'), req.originalUrl)
            .then(html => { res.setHeader('Content-Type', TYPES.html); res.end(html) }, next)
          return
        }
        if (!url.startsWith(HUB_PATH)) return next()
        examples ??= allExamples(o, new Date()).files
        const key = url.slice(1).replace(/\/$/, '/index.html').replace(/\/privacy$/, '/privacy.html')
        const body = examples[key]
        if (!body) return next()
        res.setHeader('Content-Type', TYPES[key.split('.').pop() ?? 'html'] ?? TYPES.html)
        res.end(body)
      })
    },
    generateBundle: {
      order: 'post',
      handler(_, bundle) {
        this.emitFile({ type: 'asset', fileName: 'site.webmanifest', source: MANIFEST })
        const hub = bundle['websites-for/index.html']
        if (!hub || hub.type !== 'asset') return
        const hubHtml = String(hub.source)
        for (const pack of PAGE_PACKS) {
          this.emitFile({ type: 'asset', fileName: `${typePath(pack).slice(1)}index.html`, source: typePageFrom(hubHtml, pack, o) })
        }
        const ex = allExamples(o, new Date())
        for (const [fileName, source] of Object.entries(ex.files)) this.emitFile({ type: 'asset', fileName, source })
        for (const photo of ex.photos) this.emitFile({ type: 'asset', fileName: `${PHOTO_PATH.slice(1)}${photo}`, source: readFileSync(`${PHOTOS}${photo}`) })
      },
    },
  }
}
