// Accessibility in a real browser: axe with colour contrast ON over every theme and a spread
// of brand colours, whole sample pages and every shown option, at desktop and phone width.
//
//   npm run a11y
//   npm run a11y -- --query "theme=workwear&brands=%23FFE500"
//
// Exits non-zero on any violation.
import { openSheet } from './browser.mjs'

const args = process.argv.slice(2)
const i = args.indexOf('--query')
const query = `mode=a11y&${i >= 0 ? args[i + 1] : ''}`

const { page, close } = await openSheet(query)
try {
  
  await page.waitForFunction(() => window.__a11y?.done, undefined, { timeout: 60 * 60_000, polling: 2000 })
  const state = await page.evaluate(() => window.__a11y)

  if (state.errors.length) {
    console.error(state.errors.join('\n'))
    process.exitCode = 1
  }
  for (const r of state.results) console.log(`${r.theme} ${r.brand} ${r.where} @${r.width}px\n  ${r.violations.join('\n  ')}`)
  console.log(`\nChecked ${state.checked} renders; ${state.results.length} with violations.`)
  if (state.results.length) process.exitCode = 1
} finally {
  await close()
}
