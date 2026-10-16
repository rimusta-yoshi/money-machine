import { parseConfig } from '../core/config'
import type { Config } from '../core/config'
import { mailerFor } from '../core/email'
import type { Deps } from '../core/ports'
import { stripePayments } from '../core/stripe'
import { dohDns } from '../core/dns'
import { httpDomainConnect } from '../core/domainConnect'
import { cloudflareHostnames } from '../core/saas'
import { d1Database } from './d1'
import { d1Domains } from './d1Domains'
import { d1Insights } from './d1Insights'
import { r2Blobs, workerAssets } from './r2'
import { cloudflareBackups } from './backupStore'

/**
 * The thin Cloudflare layer: bindings in, plain interfaces out. Everything Cloudflare-specific
 * lives in this folder (and the wrangler configs); server/core never imports from here.
 */
export interface Env {
  BUCKET: R2Bucket
  /** API worker: the backup bucket (siteblocks-backups). Unbound: backups are off. */
  BACKUPS?: R2Bucket
  ASSETS: Fetcher
  /** The API worker; the site worker reads it only to know which site an own domain shows. */
  DB?: D1Database
  /** Workers rate limiting (API worker): caps builder events per address, in memory at the edge, nothing stored. */
  EVENT_LIMIT?: RateLimit
  BASE_DOMAIN: string
  BUILDER_ORIGINS?: string
  NOINDEX?: string
  PREVIEW_DAYS?: string
  BRAND_NAME?: string
  APP_URL?: string
  PRICE_PENCE?: string
  REFUND_DAYS?: string
  LAUNCHED?: string
  EMAIL_FROM?: string
  SUPPORT_EMAIL?: string
  /** Own domains (Cloudflare for SaaS): the zone's id and the CNAME target customers point at. */
  CF_ZONE_ID?: string
  DOMAINS_TARGET?: string
  /** One-click connecting (Domain Connect): providers switched on, and our template's ids. */
  DC_PROVIDERS?: string
  DC_PROVIDER_ID?: string
  DC_SERVICE_ID?: string
  DC_KEY_HOST?: string
  /** Site worker: seconds an own domain's site is remembered. */
  HOST_CACHE_SECONDS?: string
  /** Secrets (wrangler secret put; .dev.vars locally). */
  ADMIN_TOKEN?: string
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  LINK_SECRET?: string
  RESEND_API_KEY?: string
  TESTER_CODE?: string
  /** Cloudflare API token: SSL and Certificates · Edit on the zone (custom hostnames). */
  CF_SAAS_TOKEN?: string
  /** Signs Domain Connect requests (PKCS#8 RSA private key). */
  DC_PRIVATE_KEY?: string
}

let cached: { env: Env; config: Config } | null = null

function config(env: Env): Config {
  if (cached?.env !== env) cached = { env, config: parseConfig(env as unknown as Record<string, unknown>) }
  return cached.config
}

const noDatabase = new Proxy({}, { get: () => () => Promise.reject(new Error('This worker has no database')) })

/** Work the response shouldn't wait for. Without a request context (tests of the adapter) it just runs. */
const quiet = (ctx: Pick<ExecutionContext, 'waitUntil'> | undefined) => (work: Promise<unknown>) => {
  const safe = work.catch(err => console.warn('Background work failed', err))
  ctx?.waitUntil(safe)
}

export function depsFrom(env: Env, ctx?: Pick<ExecutionContext, 'waitUntil'>): Deps {
  const c = config(env)
  const ip = (req: Request) => req.headers.get('CF-Connecting-IP') ?? 'unknown'
  const dns = dohDns()
  return {
    config: c,
    db: env.DB ? d1Database(env.DB) : (noDatabase as Deps['db']),
    domains: env.DB ? d1Domains(env.DB) : (noDatabase as Deps['domains']),
    saas: c.saas ? cloudflareHostnames(c.saas.token, c.saas.zoneId) : null,
    dns,
    domainConnect: c.domainConnect ? httpDomainConnect(c.domainConnect, dns) : null,
    insights: env.DB ? d1Insights(env.DB) : (noDatabase as Deps['insights']),
    blobs: r2Blobs(env.BUCKET),
    assets: workerAssets(env.ASSETS),
    payments: c.stripe ? stripePayments(c.stripe.secretKey) : null,
    mailer: mailerFor(c.email),
    now: () => Date.now(),
    clientIp: ip,
    later: quiet(ctx),
    allowEvent: async req => {
      if (!env.EVENT_LIMIT) return true
      try {
        return (await env.EVENT_LIMIT.limit({ key: ip(req) })).success
      } catch {
        return true
      }
    },
    backups: cloudflareBackups(env.DB, env.BUCKET, env.BACKUPS),
  }
}
