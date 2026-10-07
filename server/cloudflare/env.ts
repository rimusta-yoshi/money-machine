import { parseConfig } from '../core/config'
import type { Config } from '../core/config'
import { mailerFor } from '../core/email'
import type { Deps } from '../core/ports'
import { stripePayments } from '../core/stripe'
import { d1Database } from './d1'
import { r2Blobs, workerAssets } from './r2'

/**
 * The thin Cloudflare layer: bindings in, plain interfaces out. Everything Cloudflare-specific
 * lives in this folder (and the wrangler configs); server/core never imports from here.
 */
export interface Env {
  BUCKET: R2Bucket
  ASSETS: Fetcher
  /** The API worker only. */
  DB?: D1Database
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
  /** Secrets (wrangler secret put; .dev.vars locally). */
  ADMIN_TOKEN?: string
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  LINK_SECRET?: string
  RESEND_API_KEY?: string
  TESTER_CODE?: string
}

let cached: { env: Env; config: Config } | null = null

function config(env: Env): Config {
  if (cached?.env !== env) cached = { env, config: parseConfig(env as unknown as Record<string, unknown>) }
  return cached.config
}

const noDatabase = new Proxy({}, { get: () => () => Promise.reject(new Error('This worker has no database')) })

export function depsFrom(env: Env): Deps {
  const c = config(env)
  return {
    config: c,
    db: env.DB ? d1Database(env.DB) : (noDatabase as Deps['db']),
    blobs: r2Blobs(env.BUCKET),
    assets: workerAssets(env.ASSETS),
    payments: c.stripe ? stripePayments(c.stripe.secretKey) : null,
    mailer: mailerFor(c.email),
    now: () => Date.now(),
    clientIp: req => req.headers.get('CF-Connecting-IP') ?? 'unknown',
  }
}
