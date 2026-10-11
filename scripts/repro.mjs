// Reproduces a builder screen from "Copy debug info" (Alt+Shift+D in a dev build): the
// section that was being edited is generated again in a real browser, exactly as the
// builder did, and every candidate is shown with the checks it failed.
//
//   npm run repro -- debug.json           prints the result and saves debug.png beside it
import { readFileSync } from 'node:fs'
import { launchBrowser, startSheetServer } from './browser.mjs'

const [file] = process.argv.slice(2).filter(a => !a.startsWith('--'))
if (!file) { console.error('Usage: npm run repro -- <debug.json>'); process.exit(2) }
const info = JSON.parse(readFileSync(file, 'utf8'))
if (info.kind !== 'localblocks-debug') { console.error('That file isn’t debug info from the builder.'); process.exit(2) }

const { url, close } = await startSheetServer()
const browser = await launchBrowser()
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
  page.on('pageerror', err => console.error('page error:', err.message))
  await page.addInitScript(c => { window.__debugCase = c }, info)
  await page.goto(`${url}sheet.html?mode=inspect`)
  await page.waitForFunction(() => window.__inspect?.done, undefined, { timeout: 120_000 })
  const r = await page.evaluate(() => window.__inspect)
  if (r.error) throw new Error(r.error)
  console.log(`${info.build?.section ?? 'hero'}: ${r.shown.length} options`)
  for (const s of r.shown) console.log(`  ${s}`)
  console.log(`Rejected by: ${Object.entries(r.rejected).map(([k, n]) => `${k} ×${n}`).join(', ') || 'nothing'}`)
  if (r.matches !== null) console.log(r.matches ? 'Same options as the builder showed.' : 'Different options from what the builder showed (check fonts and photos).')
  const shot = file.replace(/\.json$/i, '') + '.png'
  await page.screenshot({ path: shot, fullPage: true })
  console.log(`Saved ${shot}`)
} finally {
  await browser.close()
  await close()
}
