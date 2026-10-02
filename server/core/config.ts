/**
 * Server settings, from plain string variables (wrangler vars and secrets on Cloudflare;
 * any environment elsewhere). The base domain is the one value that decides every address.
 */
export interface Config {
  /** e.g. siteblocks.co.uk (a port is allowed for local runs: siteblocks.localhost:8787). */
  baseDomain: string
  /** Builder origins allowed to call the API and fetch sample photos, e.g. http://localhost:5173. */
  builderOrigins: ReadonlySet<string>
  /** Staging: every page says noindex and robots.txt disallows everything. */
  noindex: boolean
  previewDays: number
  /** Until payment exists (Phase 2), publishing needs this key. Unset: publishing is closed. */
  adminToken: string | null
}

const HOST = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:\d{2,5})?$/

/** Reads one setting; plain checks rather than a schema library, so the site worker stays tiny. */
function setting(env: Record<string, unknown>, name: string, fallback?: string): string {
  const v = env[name]
  if (v === undefined || v === '') {
    if (fallback === undefined) throw new Error(`${name} is not set`)
    return fallback
  }
  if (typeof v !== 'string') throw new Error(`${name} must be a string`)
  return v.trim()
}

export function parseConfig(env: Record<string, unknown>): Config {
  const baseDomain = setting(env, 'BASE_DOMAIN').toLowerCase()
  if (!HOST.test(baseDomain)) throw new Error('BASE_DOMAIN must be a domain like siteblocks.co.uk')
  const noindex = setting(env, 'NOINDEX', 'true')
  if (noindex !== 'true' && noindex !== 'false') throw new Error('NOINDEX must be "true" or "false"')
  const previewDays = Number(setting(env, 'PREVIEW_DAYS', '30'))
  if (!Number.isInteger(previewDays) || previewDays < 1 || previewDays > 90) throw new Error('PREVIEW_DAYS must be a whole number from 1 to 90')
  const origins = setting(env, 'BUILDER_ORIGINS', '').split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const url = new URL(s)
    if (url.origin !== s.replace(/\/$/, '')) throw new Error(`BUILDER_ORIGINS: "${s}" is not a bare origin`)
    return url.origin
  })
  const token = setting(env, 'ADMIN_TOKEN', '')
  if (token && token.length < 24) throw new Error('ADMIN_TOKEN must be at least 24 characters')
  return { baseDomain, builderOrigins: new Set(origins), noindex: noindex === 'true', previewDays, adminToken: token || null }
}

export const apiHost = (c: Config): string => `api.${c.baseDomain}`
export const previewHost = (c: Config): string => `preview.${c.baseDomain}`
export const previewOrigin = (c: Config): string => `https://${previewHost(c)}`
export const siteOrigin = (c: Config, slug: string): string => `https://${slug}.${c.baseDomain}`

/** The slug a Host header names, or null if it isn't one label under the base domain. */
export function slugFromHost(host: string, c: Config): string | null {
  const h = host.toLowerCase()
  const suffix = `.${c.baseDomain}`
  if (!h.endsWith(suffix)) return null
  const label = h.slice(0, -suffix.length)
  return /^[a-z0-9-]+$/.test(label) ? label : null
}
