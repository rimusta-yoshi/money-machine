// Renders the theme contact sheet (sheet.html) in a real browser and saves it as a static
// page: reference/contact-sheet/index.html, with its photos and fonts beside it.
//
//   npm run sheet                          every theme, every section, three sample pages each
//   npm run sheet -- --query "theme=workwear&section=hero"
//   npm run sheet -- --shots <dir>         also save a PNG of every option (for close review)
//
// Uses the Chrome (or Edge) already installed on this machine through playwright-core, so
// nothing is downloaded. Options are generated with the real DOM measurer, exactly as the
// builder does.
import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { openSheet, root } from './browser.mjs'

const out = join(root, 'reference', 'contact-sheet')
const args = process.argv.slice(2)
const arg = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const query = arg('--query') ?? ''
const shots = arg('--shots')

async function main() {
  const { page, close } = await openSheet(query)
  try {
    let last = ''
    await page.waitForFunction(() => window.__sheet?.done, undefined, { timeout: 20 * 60_000, polling: 1000 }).catch(e => { throw e })
    const state = await page.evaluate(() => window.__sheet)
    if (state.errors.length) throw new Error(`The sheet failed:\n${state.errors.join('\n')}`)
    if (state.progress !== last) last = state.progress

    if (shots) {
      rmSync(shots, { recursive: true, force: true })
      mkdirSync(shots, { recursive: true })
      const items = await page.$$('.cs-opt, .cs-page')
      let n = 0
      for (const item of items) {
        const label = (await item.$eval('.cs-tag, .cs-section-h', el => el.textContent ?? '')).replace(/[^a-z0-9]+/gi, '-').slice(0, 80)
        await item.screenshot({ path: join(shots, `${String(++n).padStart(3, '0')}-${label}.png`) })
      }
      console.log(`Saved ${n} screenshots to ${shots}`)
    }

    let html = await page.content()
    rmSync(out, { recursive: true, force: true })
    mkdirSync(join(out, 'img'), { recursive: true })
    mkdirSync(join(out, 'fonts'), { recursive: true })
    // Photos: one file each instead of repeating the data URL in every option.
    const files = new Map()
    html = html.replace(/data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+/g, (dataUrl, ext) => {
      const hash = createHash('sha1').update(dataUrl).digest('hex').slice(0, 12)
      const name = `img/${hash}.${ext === 'jpeg' ? 'jpg' : ext}`
      if (!files.has(name)) {
        files.set(name, true)
        writeFileSync(join(out, name), Buffer.from(dataUrl.split(',')[1], 'base64'))
      }
      return name
    })
    for (const f of readdirSync(join(root, 'public', 'fonts'))) copyFileSync(join(root, 'public', 'fonts', f), join(out, 'fonts', f))
    html = html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
      .replace('href="/fonts/fonts.css"', 'href="fonts/fonts.css"')
    writeFileSync(join(out, 'index.html'), html)
    console.log(`Contact sheet: ${join(out, 'index.html')} (${Math.round(html.length / 1024)} KB, ${files.size} photos)`)
  } finally {
    await close()
  }
}

main().catch(err => { console.error(err); process.exit(1) })
