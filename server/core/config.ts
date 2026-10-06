/**
 * Server settings, from plain string variables (wrangler vars and secrets on Cloudflare;
 * any environment elsewhere). The base domain is the one value that decides every address.
 */
export interface Config {
  /** e.g. siteblocks.co.uk (a port is allowed for local runs: siteblocks.localhost:8787). */
  baseDomain: string
  /** The product's name in emails and on the Stripe page. Changes with the rename, nowhere else. */
  brandName: string
  /** Where the homepage and builder live (links in emails, Stripe's return pages). No trailing slash. */
  appUrl: string
  /** Builder origins allowed to call the API and fetch sample photos, e.g. http://localhost:5173. */
  builderOrigins: ReadonlySet<string>
  /** Staging: every page says noindex and robots.txt disallows everything. */
  noindex: boolean
  previewDays: number
  /** Publishing without paying (testing and support only). Unset: closed. */
  adminToken: string | null
  /** The one price, in pence. The builder never sends an amount. */
  pricePence: number
  currency: 'gbp'
  /** Days after paying that the self-serve refund link works. */
  refundDays: number
  /** Card payments. Null: checkout is closed (the builder says so). */
  stripe: { secretKey: string; webhookSecret: string } | null
  /** Signs edit and refund links. Required when payments are on. */
  linkSecret: string | null
  email: { from: string; support: string; resendKey: string | null }
}

const HOST = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:\d{2,5})?$/
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

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

function wholeNumber(env: Record<string, unknown>, name: string, fallback: string, min: number, max: number): number {
  const n = Number(setting(env, name, fallback))
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${name} must be a whole number from ${min} to ${max}`)
  return n
}

function stripeSettings(env: Record<string, unknown>): Config['stripe'] {
  const secretKey = setting(env, 'STRIPE_SECRET_KEY', '')
  const webhookSecret = setting(env, 'STRIPE_WEBHOOK_SECRET', '')
  if (!secretKey && !webhookSecret) return null
  if (!/^(sk|rk)_(test|live)_\w+$/.test(secretKey)) throw new Error('STRIPE_SECRET_KEY must be a Stripe secret key (sk_test_…)')
  // Test mode only until launch: a live key is refused unless switched on on purpose.
  if (/_live_/.test(secretKey) && setting(env, 'STRIPE_ALLOW_LIVE', 'false') !== 'true') throw new Error('STRIPE_SECRET_KEY is a live key; set STRIPE_ALLOW_LIVE=true to use it')
  if (!/^whsec_\w+$/.test(webhookSecret)) throw new Error('STRIPE_WEBHOOK_SECRET must be a webhook signing secret (whsec_…)')
  return { secretKey, webhookSecret }
}

function emailAddress(env: Record<string, unknown>, name: string, fallback: string): string {
  const v = setting(env, name, fallback)
  // "Name <address>" or a bare address.
  const address = /<([^>]+)>$/.exec(v)?.[1] ?? v
  if (!EMAIL.test(address)) throw new Error(`${name} must be an email address`)
  return v
}

export function parseConfig(env: Record<string, unknown>): Config {
  const baseDomain = setting(env, 'BASE_DOMAIN').toLowerCase()
  if (!HOST.test(baseDomain)) throw new Error('BASE_DOMAIN must be a domain like siteblocks.co.uk')
  const noindex = setting(env, 'NOINDEX', 'true')
  if (noindex !== 'true' && noindex !== 'false') throw new Error('NOINDEX must be "true" or "false"')
  const origins = setting(env, 'BUILDER_ORIGINS', '').split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const url = new URL(s)
    if (url.origin !== s.replace(/\/$/, '')) throw new Error(`BUILDER_ORIGINS: "${s}" is not a bare origin`)
    return url.origin
  })
  const appUrl = setting(env, 'APP_URL', `https://${baseDomain}`).replace(/\/+$/, '')
  if (new URL(appUrl).origin !== appUrl) throw new Error('APP_URL must be a bare origin like https://siteblocks.co.uk')
  const token = setting(env, 'ADMIN_TOKEN', '')
  if (token && token.length < 24) throw new Error('ADMIN_TOKEN must be at least 24 characters')
  const stripe = stripeSettings(env)
  const linkSecret = setting(env, 'LINK_SECRET', '')
  if (linkSecret && linkSecret.length < 32) throw new Error('LINK_SECRET must be at least 32 characters')
  if (stripe && !linkSecret) throw new Error('LINK_SECRET is needed when payments are on')
  return {
    baseDomain,
    brandName: setting(env, 'BRAND_NAME', baseDomain),
    appUrl,
    builderOrigins: new Set(origins),
    noindex: noindex === 'true',
    previewDays: wholeNumber(env, 'PREVIEW_DAYS', '30', 1, 90),
    adminToken: token || null,
    pricePence: wholeNumber(env, 'PRICE_PENCE', '9900', 100, 100_000),
    currency: 'gbp',
    refundDays: wholeNumber(env, 'REFUND_DAYS', '14', 1, 60),
    stripe,
    linkSecret: linkSecret || null,
    email: {
      from: emailAddress(env, 'EMAIL_FROM', `hello@${baseDomain.replace(/:\d+$/, '')}`),
      support: emailAddress(env, 'SUPPORT_EMAIL', `help@${baseDomain.replace(/:\d+$/, '')}`),
      resendKey: setting(env, 'RESEND_API_KEY', '') || null,
    },
  }
}

export const apiHost = (c: Config): string => `api.${c.baseDomain}`
export const previewHost = (c: Config): string => `preview.${c.baseDomain}`
export const previewOrigin = (c: Config): string => `https://${previewHost(c)}`
export const siteOrigin = (c: Config, slug: string): string => `https://${slug}.${c.baseDomain}`
/** The builder page, where edit, refund and lost-link screens live too. */
export const builderUrl = (c: Config): string => `${c.appUrl}/build/`

/** £99, or £99.50: how a price is said in emails. */
export const money = (pence: number): string => `£${(pence / 100).toFixed(pence % 100 ? 2 : 0)}`

/** The slug a Host header names, or null if it isn't one label under the base domain. */
export function slugFromHost(host: string, c: Pick<Config, 'baseDomain'>): string | null {
  const h = host.toLowerCase()
  const suffix = `.${c.baseDomain}`
  if (!h.endsWith(suffix)) return null
  const label = h.slice(0, -suffix.length)
  return /^[a-z0-9-]+$/.test(label) ? label : null
}
