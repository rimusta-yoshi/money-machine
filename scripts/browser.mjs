// Shared by the contact sheet and the accessibility run: a Vite dev server for sheet.html
// and the Chrome (or Edge) already installed here, driven by playwright-core. Nothing is downloaded.
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createServer } from 'vite'

export const root = join(dirname(fileURLToPath(import.meta.url)), '..')

export async function launchBrowser() {
  for (const channel of ['chrome', 'msedge']) {
    try { return await chromium.launch({ channel, headless: true }) } catch { /* try the next one */ }
  }
  throw new Error('No local Chrome or Edge found for playwright-core')
}

/** Serves the repo with Vite and opens sheet.html with the given query. */
export async function openSheet(query) {
  const server = await createServer({ root, server: { port: 5199, strictPort: false }, logLevel: 'error' })
  await server.listen()
  const browser = await launchBrowser()
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
  page.on('pageerror', err => console.error('page error:', err.message))
  await page.goto(`${server.resolvedUrls.local[0]}sheet.html?${query}`)
  return { page, close: async () => { await browser.close(); await server.close() } }
}
