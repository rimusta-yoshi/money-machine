// Full-page screenshots of our own pages at phone and desktop width, for reviewing wording and
// layout (the "Websites for…" pages, the hub, the FAQ, the 404 page).
//
//   npm run page-shots -- /websites-for/ /websites-for/plumbers/        into docs/pm/screenshots
//   npm run page-shots -- --out some/folder /faq/
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createServer } from 'vite'
import { launchBrowser } from './browser.mjs'
import { root } from './packs.mjs'

const args = process.argv.slice(2)
const outAt = args.indexOf('--out')
const out = outAt >= 0 ? args[outAt + 1] : join(root, 'docs', 'pm', 'screenshots')
const paths = args.filter((a, i) => a.startsWith('/') && (outAt < 0 || i !== outAt + 1))
const VIEWPORTS = { phone: { width: 390, height: 844, isMobile: true }, desktop: { width: 1440, height: 900, isMobile: false } }

mkdirSync(out, { recursive: true })
const server = await createServer({ root, server: { port: 5195, strictPort: false }, logLevel: 'error' })
await server.listen()
const base = server.resolvedUrls.local[0].replace(/\/$/, '')
const browser = await launchBrowser()
try {
  for (const [name, vp] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.isMobile, reducedMotion: 'reduce' })
    const page = await context.newPage()
    for (const path of paths) {
      await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
      await page.evaluate(() => document.fonts.ready)
      // Scroll through once so lazy-loaded pictures arrive before the full-page shot.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)) }
        window.scrollTo(0, 0)
      })
      await page.waitForLoadState('networkidle')
      const file = join(out, `${path.replace(/^\/|\/$/g, '').replace(/\//g, '-') || 'home'}-${name}.png`)
      await page.screenshot({ path: file, fullPage: true })
      console.log(file)
    }
    await context.close()
  }
} finally {
  await browser.close()
  await server.close()
}
