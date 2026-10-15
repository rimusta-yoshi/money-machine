// Makes the images the "Websites for…" pages need, in real Chrome, into public/ (commit them):
// - each pack's three example screenshots (public/websites-for/<slug>/example-<n>.jpg), taken
//   from the example sites the build renders with the real generator;
// - the link-preview images (public/og/home.png and public/og/<slug>.png);
// - the favicon set from public/favicon.svg (favicon.ico, apple-touch-icon.png, icon-192/512.png).
//
//   npm run pack:images                  everything
//   npm run pack:images -- plumbers      one type's screenshots and preview image (by slug)
//
// Run it after adding a business type or changing one's examples. Uses the Chrome (or Edge)
// already installed, like the stress test.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createServer } from 'vite'
import { launchBrowser } from './browser.mjs'
import { root } from './packs.mjs'

const only = process.argv.slice(2).filter(a => !a.startsWith('-'))
const PUBLIC = join(root, 'public')
const write = (path, bytes) => {
  mkdirSync(dirname(join(PUBLIC, path)), { recursive: true })
  writeFileSync(join(PUBLIC, path), bytes)
  console.log(`  public/${path}`)
}

/** A .ico holding one PNG (allowed since Windows Vista; every current browser reads it). */
function ico(png, size) {
  const head = Buffer.alloc(22)
  head.writeUInt16LE(0, 0)
  head.writeUInt16LE(1, 2)
  head.writeUInt16LE(1, 4)
  head.writeUInt8(size % 256, 6)
  head.writeUInt8(size % 256, 7)
  head.writeUInt16LE(1, 10)
  head.writeUInt16LE(32, 12)
  head.writeUInt32LE(png.length, 14)
  head.writeUInt32LE(22, 18)
  return Buffer.concat([head, png])
}

const server = await createServer({ root, server: { port: 5196, strictPort: false }, logLevel: 'error' })
await server.listen()
const base = server.resolvedUrls.local[0].replace(/\/$/, '')
const browser = await launchBrowser()
try {
  const { PAGE_PACKS } = await server.ssrLoadModule('/src/packs/pages.ts')
  const { examplePath, exampleShot, ogImage } = await server.ssrLoadModule('/src/pages/types/paths.ts')
  const { ogCardHtml } = await server.ssrLoadModule('/src/pages/og.ts')
  const packs = PAGE_PACKS.filter(p => !only.length || only.includes(p.slug))

  // Example screenshots: the top of each example site, as a desktop visitor first sees it.
  const shots = await browser.newPage({ viewport: { width: 1280, height: 880 }, deviceScaleFactor: 0.6 })
  for (const p of packs) {
    console.log(`${p.name}:`)
    for (const n of [0, 1, 2]) {
      await shots.goto(`${base}${examplePath(p, n)}`, { waitUntil: 'networkidle' })
      await shots.evaluate(() => document.fonts.ready)
      write(exampleShot(p, n).slice(1), await shots.screenshot({ type: 'jpeg', quality: 72 }))
    }
  }
  await shots.close()

  // Link-preview cards, drawn from src/pages/og.ts.
  const card = await browser.newPage({ viewport: { width: 1200, height: 630 } })
  const photograph = async (html, path) => {
    await card.route(`${base}/__og`, route => route.fulfill({ body: html, contentType: 'text/html' }))
    await card.goto(`${base}/__og`, { waitUntil: 'networkidle' })
    await card.evaluate(() => document.fonts.ready)
    write(path, await card.screenshot({ type: 'png' }))
    await card.unroute(`${base}/__og`)
  }
  for (const p of packs) {
    await photograph(ogCardHtml({ kicker: `Websites for ${p.plural}`, headline: p.landing.headline, shot: exampleShot(p, 0) }), ogImage(p).slice(1))
  }
  if (!only.length) {
    await photograph(ogCardHtml({ kicker: 'Websites for tradespeople', headline: 'Stack a few blocks. Get a website.', shot: null }), 'og/home.png')

    // The favicon set, from the 2×2 block mark. Phones put the touch icons on a white tile.
    const svg = readFileSync(join(PUBLIC, 'favicon.svg'), 'utf8')
    const icon = await browser.newPage({ viewport: { width: 512, height: 512 } })
    const draw = async (size, padding, background) => {
      await icon.setViewportSize({ width: size, height: size })
      await icon.setContent(`<html><body style="margin:0;background:${background};display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">`
        + `<div style="width:${size - padding * 2}px;height:${size - padding * 2}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`)
      return icon.screenshot({ type: 'png', omitBackground: background === 'transparent' })
    }
    write('favicon.ico', ico(await draw(32, 0, 'transparent'), 32))
    write('apple-touch-icon.png', await draw(180, 22, '#FFFFFF'))
    write('icon-192.png', await draw(192, 24, '#FFFFFF'))
    write('icon-512.png', await draw(512, 64, '#FFFFFF'))
    await icon.close()
  }
} finally {
  await browser.close()
  await server.close()
}
