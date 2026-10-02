import { parseConfig } from '../core/config'
import type { Config } from '../core/config'
import type { Deps } from '../core/ports'
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
  ADMIN_TOKEN?: string
}

let cached: { env: Env; config: Config } | null = null

function config(env: Env): Config {
  if (cached?.env !== env) cached = { env, config: parseConfig(env as unknown as Record<string, unknown>) }
  return cached.config
}

const noDatabase = new Proxy({}, { get: () => () => Promise.reject(new Error('This worker has no database')) })

export function depsFrom(env: Env): Deps {
  return {
    config: config(env),
    db: env.DB ? d1Database(env.DB) : (noDatabase as Deps['db']),
    blobs: r2Blobs(env.BUCKET),
    assets: workerAssets(env.ASSETS),
    now: () => Date.now(),
    clientIp: req => req.headers.get('CF-Connecting-IP') ?? 'unknown',
  }
}
