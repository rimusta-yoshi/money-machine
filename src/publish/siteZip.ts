import { zipFiles } from './zip'
import type { ZipEntry } from './zip'

/** GET /v1/draft/export: text files as they go in the zip, and binaries to fetch from the live site. */
export interface SiteExport {
  /** The zip's file name, e.g. joes-plumbing.zip. */
  name: string
  files: { path: string; text: string }[]
  fetch: { path: string; url: string }[]
}

/**
 * "Download your site", in the browser: the server's portable files plus the photos and fonts
 * fetched from the live site, zipped here (the server never zips). Any missing file stops the
 * download rather than giving a site with holes in it.
 */
export async function buildSiteZip(exp: SiteExport, fetcher: (url: string) => Promise<Response> = url => fetch(url)): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const texts: ZipEntry[] = exp.files.map(f => ({ path: f.path, data: enc.encode(f.text) }))
  const binaries = await Promise.all(exp.fetch.map(async (f): Promise<ZipEntry> => {
    let res: Response
    try {
      res = await fetcher(f.url)
    } catch {
      throw new Error('We couldn’t fetch your photos just now. Check your connection and try again.')
    }
    if (!res.ok) throw new Error('Part of your site couldn’t be fetched. Please try again in a minute.')
    return { path: f.path, data: new Uint8Array(await res.arrayBuffer()) }
  }))
  // The pages first, so they're at the top when the zip is opened.
  return zipFiles([...texts, ...binaries])
}
