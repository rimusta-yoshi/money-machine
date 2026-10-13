import { PAGES } from '../../src/brand/config'
import { fontFiles, photoFiles, portableCss, portableHtml, readmeTxt } from '../../src/publish/portable'
import type { SiteExport } from '../../src/publish/siteZip'
import { siteOrigin } from './config'
import { authDraft } from './drafts'
import { HttpError, json } from './http'
import { rateLimit } from './limits'
import type { Deps, DraftRow } from './ports'
import { goneKey, sitePrefix } from './storage'

/**
 * GET /v1/draft/export: "Download your site", for a paid site that's live. Answers with the
 * published pages and stylesheet made portable (relative links), a README, and the photos and
 * fonts to fetch from the live site; the builder fetches those and makes the .zip in the
 * browser (no zipping on the server). Refunded, disputed and taken-down sites can't download.
 */

/** Downloads per site per day. */
export const DOWNLOADS_PER_DAY = 10
const DAY_SEC = 24 * 60 * 60

const toText = async (body: ReadableStream | ArrayBuffer): Promise<string> => new Response(body).text()

/** Who may download: the owner of a paid site that's live now. */
function liveSlug(draft: DraftRow): string {
  if (!draft.payment || !draft.slug) throw new HttpError(403, 'not_paid', 'Downloading is for sites that are paid for and live.')
  if (draft.refundedAt) throw new HttpError(403, 'refunded', 'This site was refunded and taken down, so it can’t be downloaded.')
  if (draft.disputedAt || draft.disputeLostAt) throw new HttpError(403, 'disputed', 'Your site is paused while a payment dispute is open, so it can’t be downloaded. Get in touch and we’ll help.')
  return draft.slug
}

/** Counts this download against the site's daily allowance. */
async function countDownload(deps: Deps, ref: string): Promise<void> {
  const nowSec = Math.floor(deps.now() / 1000)
  const dayStart = nowSec - (nowSec % DAY_SEC)
  if ((await deps.db.hit(`download:${ref}`, dayStart)) > DOWNLOADS_PER_DAY) {
    throw new HttpError(429, 'rate_limited', `You’ve downloaded your site ${DOWNLOADS_PER_DAY} times today. Please try again tomorrow.`, {}, { 'Retry-After': String(dayStart + DAY_SEC - nowSec) })
  }
}

async function readText(deps: Deps, key: string): Promise<string | null> {
  const obj = await deps.blobs.get(key)
  return obj ? toText(obj.body) : null
}

export async function exportSite(req: Request, deps: Deps): Promise<Response> {
  await rateLimit(deps, req, 'download')
  const draft = await authDraft(req, deps)
  const slug = liveSlug(draft)
  const prefix = sitePrefix(slug)
  // Only while the address is still this site's, and not taken down.
  if ((await deps.db.slugOwner(slug, deps.now())) !== draft.ref || await deps.blobs.get(goneKey(slug))) {
    throw new HttpError(403, 'taken_down', 'This site has been taken down, so it can’t be downloaded.')
  }
  const [index, privacy, favicon] = await Promise.all([
    readText(deps, `${prefix}index.html`), readText(deps, `${prefix}privacy.html`), readText(deps, `${prefix}favicon.svg`),
  ])
  // The stylesheet the page links (during a republish the old one is still stored for a moment).
  const cssName = index ? /href="\/(site-[0-9a-f]+\.css)"/.exec(index)?.[1] : undefined
  const css = cssName ? await readText(deps, prefix + cssName) : null
  const keys = await deps.blobs.list(prefix)
  const photos = index && privacy ? photoFiles(index, privacy) : []
  if (!index || !privacy || !css || !cssName) throw new HttpError(409, 'not_live', 'Your site isn’t live at the moment. Publish it, then try again.')
  if (photos.some(p => !keys.includes(prefix + p))) throw new HttpError(409, 'not_live', 'Some of your photos are still being published. Please try again in a minute.')
  // Counted only once the download can go ahead.
  await countDownload(deps, draft.ref)

  const origin = siteOrigin(deps.config, slug)
  const files: SiteExport['files'] = [
    { path: 'index.html', text: portableHtml(index) },
    { path: 'privacy.html', text: portableHtml(privacy) },
    { path: cssName, text: portableCss(css) },
    ...(favicon ? [{ path: 'favicon.svg', text: favicon }] : []),
    {
      path: 'README.txt',
      text: readmeTxt({ brand: deps.config.brandName, siteUrl: `${origin}/`, guideUrl: `${deps.config.appUrl}${PAGES.hostingGuide}`, date: new Date(deps.now()).toISOString().slice(0, 10) }),
    },
  ]
  const fetch: SiteExport['fetch'] = [
    ...photos.map(p => ({ path: p, url: `${origin}/${p}` })),
    // The fonts' licence travels with them (SIL Open Font License).
    ...[...fontFiles(css), 'LICENSES.txt'].map(f => ({ path: `fonts/${f}`, url: `${origin}/fonts/${f}` })),
  ]
  const body: SiteExport = { name: `${slug}.zip`, files, fetch }
  return json(body, 200, { 'Cache-Control': 'no-store' })
}
