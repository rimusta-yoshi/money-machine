/**
 * Both workers running locally under Miniflare (the same runtime as Cloudflare), with a local
 * D1 database, R2 bucket and the fonts as assets. Used by the server tests, the browser
 * end-to-end test and `npm run dev:stack`. Node-runnable as is (no app imports).
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { convertV4MiniflareOptions, Miniflare } from 'miniflare'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const COMPAT = '2026-09-01'

export interface StackOptions {
  /** e.g. siteblocks.test, or siteblocks.localhost:8790 for a browser. */
  baseDomain: string
  /** Listen on a real port (browser runs); otherwise only dispatchFetch works. */
  port?: number
  https?: boolean
  noindex?: boolean
  adminToken?: string
  builderOrigins?: string
  /** Keep data between runs (dev stack) in this folder. */
  persistTo?: string
}

export interface Stack {
  mf: Miniflare
  /** Sends a request as if from the internet (the Host comes from the URL). */
  fetch: (url: string, init?: RequestInit) => Promise<Response>
  db: () => Promise<D1Like>
  url: string | null
  close: () => Promise<void>
}

/** The bits of D1 the tests use directly (applying migrations, ageing preview links). */
export interface D1Like {
  prepare: (sql: string) => { bind: (...v: unknown[]) => { run: () => Promise<unknown>; first: <T>() => Promise<T | null> }; run: () => Promise<unknown> }
  batch: (s: unknown[]) => Promise<unknown>
}

async function bundle(entry: string): Promise<string> {
  const out = await build({
    entryPoints: [join(root, 'server', 'cloudflare', entry)],
    bundle: true, write: false, format: 'esm', platform: 'neutral', target: 'es2022',
    mainFields: ['module', 'main'], conditions: ['workerd', 'worker', 'browser'], logLevel: 'error',
  })
  return out.outputFiles[0].text
}

let bundles: Promise<[string, string]> | null = null

const FONT_DIR = join(root, 'public', 'fonts')
const fonts = new Set(readdirSync(FONT_DIR))

/** Stands in for the Workers static-assets binding (public/fonts). */
function assets(req: Request): Response {
  const name = new URL(req.url).pathname.slice(1)
  if (!fonts.has(name)) return new Response('Not found', { status: 404 })
  return new Response(readFileSync(join(FONT_DIR, name)), { headers: { 'Content-Type': name.endsWith('.woff2') ? 'font/woff2' : 'text/plain' } })
}

export const MIGRATIONS = readdirSync(join(root, 'server', 'migrations')).sort().map(f => readFileSync(join(root, 'server', 'migrations', f), 'utf8'))

/** SQL statements of a migration file, comments dropped. Lines may end in CRLF (a Windows checkout). */
export const statements = (sql: string): string[] =>
  sql.split(/\r?\n/).map(l => l.replace(/--.*$/, '')).join('\n').split(';').map(s => s.trim()).filter(Boolean)

export async function startStack(o: StackOptions): Promise<Stack> {
  bundles ??= Promise.all([bundle('api-worker.ts'), bundle('site-worker.ts')])
  const [apiScript, siteScript] = await bundles
  const host = o.baseDomain.replace(/:\d+$/, '')
  const vars = {
    BASE_DOMAIN: o.baseDomain,
    NOINDEX: String(o.noindex ?? true),
    PREVIEW_DAYS: '30',
    BUILDER_ORIGINS: o.builderOrigins ?? 'http://localhost:5173',
    ...(o.adminToken ? { ADMIN_TOKEN: o.adminToken } : {}),
  }
  const shared = {
    compatibilityDate: COMPAT, modules: true, r2Buckets: { BUCKET: 'siteblocks' }, serviceBindings: { ASSETS: assets }, bindings: vars,
    ...(o.persistTo ? { r2Persist: join(o.persistTo, 'r2'), d1Persist: join(o.persistTo, 'd1') } : {}),
  }
  const mf = new Miniflare(convertV4MiniflareOptions({
    ...(o.port ? { port: o.port, host: '127.0.0.1', https: o.https ?? false } : {}),
    workers: [
      { ...shared, name: 'api', script: apiScript, d1Databases: { DB: 'siteblocks' }, routes: [`api.${host}/*`, `preview.${host}/*`] },
      { ...shared, name: 'sites', script: siteScript, routes: [`*.${host}/*`] },
    ],
  } as never))
  const url = o.port ? (await mf.ready).toString() : (await mf.ready, null)
  const db = async () => (await mf.getD1Database('DB', 'api')) as unknown as D1Like
  const d1 = await db()
  for (const sql of MIGRATIONS) {
    for (const s of statements(sql)) await d1.prepare(s.replace(/^CREATE (TABLE|INDEX) /, 'CREATE $1 IF NOT EXISTS ')).run()
  }
  return {
    mf,
    url,
    db,
    fetch: (u, init) => mf.dispatchFetch(u, init as never) as unknown as Promise<Response>,
    close: () => mf.dispose(),
  }
}
