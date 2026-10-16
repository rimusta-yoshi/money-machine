// Backups and restores (server/README.md "Backups and restore"). Talks to the API's admin
// endpoints with the admin key, so it needs no Cloudflare login, except the two production
// database commands, which run wrangler.
//
//   npm run backup -- list                                   the exports there are, and whether backups are healthy
//   npm run backup -- verify                                 checks the newest export downloads and adds up (exit 1 if not)
//   npm run backup -- run                                    backs up now (as the nightly cron does)
//   npm run backup -- restore-db --from <when> --to-local [--ref <ref>]
//                                                            into the local dev database (stop npm run dev:stack first)
//   npm run backup -- restore-db --from <when> --to-production [--ref <ref>] --yes
//                                                            imports an export into the live database (prints the undo first)
//   npm run backup -- time-travel --at <ISO time> --yes      puts the live database back to a moment in the last 30 days
//   npm run backup -- restore-files --site <address> | --ref <ref> [--from <when>] --yes
//                                                            puts one site's pages and photos back
//
// <when>: latest, an export id, YYYY-MM-DD (that day's newest export) or YYYY-MM (a monthly one).
// Without --yes nothing live changes: it says what it would do.
// The admin key comes from ADMIN_KEY, else admin-key.local (gitignored). --api <url> points it
// elsewhere, e.g. --api https://api.localblocks.localhost:8787 for the local dev stack.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { join } from 'node:path'
import { downloadExport, fetchOverview, pickExport, verifyBackups } from '../server/core/backup/client.ts'
import type { AdminGet } from '../server/core/backup/client.ts'
import { restoreStatements } from '../server/core/backup/sql.ts'
import type { RestoreMode } from '../server/core/backup/sql.ts'

const args = process.argv.slice(2)
const flag = (name: string) => args.includes(name)
const option = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const api = (option('--api') ?? 'https://api.localblocks.co.uk').replace(/\/+$/, '')
const local = new URL(api).hostname.endsWith('.localhost')
const DATABASE = 'siteblocks'
const CONFIG = 'server/wrangler.api.jsonc'

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

const keyFile = join(process.cwd(), 'admin-key.local')
const adminKey = process.env.ADMIN_KEY?.trim() || (existsSync(keyFile) ? readFileSync(keyFile, 'utf8').trim() : '')
if (!adminKey) fail('No admin key: set ADMIN_KEY or put it in admin-key.local.')

// The local dev stack: *.localhost names go to this computer, with its self-signed certificate.
const lookup = (_host: string, opts: { all?: boolean }, done: (...a: unknown[]) => void) =>
  (opts?.all ? done(null, [{ address: '127.0.0.1', family: 4 }]) : done(null, '127.0.0.1', 4))

function call(path: string, body?: unknown): Promise<Response> {
  const payload = body === undefined ? undefined : JSON.stringify(body)
  const url = `${api}${path}`
  const request = url.startsWith('https:') ? httpsRequest : httpRequest
  return new Promise((resolve, reject) => {
    const req = request(url, {
      method: payload ? 'POST' : 'GET',
      headers: { 'X-Admin-Key': adminKey, ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}) },
      ...(local ? { lookup, rejectUnauthorized: false } : {}),
    } as never, res => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => resolve(new Response(Buffer.concat(chunks), { status: res.statusCode ?? 500, headers: { 'Content-Type': String(res.headers['content-type'] ?? '') } })))
    })
    req.on('error', reject)
    req.end(payload)
  })
}

const get: AdminGet = path => call(path)

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await call(path, body)
  const data = (await res.json().catch(() => ({}))) as T & { message?: string }
  if (!res.ok) fail(`${res.status}: ${data.message ?? 'request failed'}`)
  return data
}

const when = (ms: number | null | undefined) => (ms ? new Date(ms).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : 'never')

async function list() {
  const o = await fetchOverview(get)
  console.log(`Backups: ${o.health.healthy ? 'healthy ✓' : 'NOT healthy ✗'}  (last database backup ${when(o.health.lastBackupAt)}, files last gone through ${when(o.status.files.lastFullPassAt)})`)
  for (const p of o.health.problems) console.log(`  ✗ ${p}`)
  console.log(`\nDaily exports (kept 30 days):\n${o.daily.map(e => `  ${e.id}`).join('\n') || '  none'}`)
  console.log(`Monthly exports (paid and published sites only, kept 12 months):\n${o.monthly.map(e => `  ${e.id}`).join('\n') || '  none'}`)
}

async function verify() {
  const r = await verifyBackups(get)
  for (const line of r.lines) console.log(`${r.ok ? '✓' : '✗'} ${line}`)
  console.log(r.ok ? '\nBackups OK ✓' : '\nBackups NOT OK ✗')
  if (!r.ok) process.exit(1)
}

async function run() {
  const r = await postJson<{ ran: Record<string, string> }>('/v1/admin/backups/run', {})
  for (const [k, v] of Object.entries(r.ran)) console.log(`${k}: ${v}`)
}

function wrangler(wranglerArgs: string[]): void {
  console.log(`> npx wrangler ${wranglerArgs.join(' ')}`)
  const r = spawnSync('npx', ['wrangler', ...wranglerArgs], { stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status !== 0) fail('wrangler failed: nothing after this step was done.')
}

async function restoreDb() {
  const from = option('--from') ?? fail('Say which backup: --from latest, an id, YYYY-MM-DD or YYYY-MM.')
  const ref = option('--ref')
  if (ref && !/^[0-9a-f]{32}$/.test(ref)) fail('--ref is a site\'s 32-character id.')
  const toLocal = flag('--to-local')
  if (toLocal === flag('--to-production')) fail('Say where: --to-local (inspect first) or --to-production.')
  // Never put a local backup into the live database.
  if (!toLocal && local) fail('--to-production takes backups from the live API only (leave out --api).')
  const chosen = pickExport(await fetchOverview(get), from)
  const d = await downloadExport(get, chosen)
  const mode: RestoreMode = ref ? { kind: 'site', ref } : toLocal ? { kind: 'recreate' } : { kind: 'replace' }
  const statements = restoreStatements(d.manifest, d.parts, mode)
  const dir = join(process.cwd(), '.wrangler', 'backups')
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `restore-${chosen.id}${ref ? `-${ref}` : ''}.sql`)
  writeFileSync(file, statements.join('\n'))
  const what = ref ? `site ${ref}'s rows` : `every table (${d.manifest.tables.map(t => `${t.name} ${t.rows}`).join(', ')})`
  console.log(`Backup ${chosen.kind} ${chosen.id}: ${what}. SQL written to ${file}`)
  if (toLocal) return restoreLocal(statements)
  if (!flag('--yes')) {
    console.log('\nNothing changed. To put this into the LIVE database, run the same command with --yes.')
    console.log(ref ? 'Only that site\'s rows are replaced.' : 'Every row of the live database is replaced by the backup\'s.')
    return
  }
  console.log('\nThe bookmark to undo this (wrangler d1 time-travel restore --bookmark=…):')
  wrangler(['d1', 'time-travel', 'info', DATABASE, '-c', CONFIG])
  wrangler(['d1', 'execute', DATABASE, '--remote', '--file', file, '-c', CONFIG, '--yes'])
  console.log('Done. Check the site(s), then run: npm run backup -- restore-files … if their files are missing too.')
}

async function restoreLocal(statements: string[]) {
  const { startStack } = await import('../server/test/stack.ts')
  const stack = await startStack({ baseDomain: 'localblocks.localhost:8787', persistTo: join(process.cwd(), '.wrangler', 'dev-stack') })
  try {
    const db = await stack.db()
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50).map(s => db.prepare(s)))
    console.log('Restored into the local dev database (.wrangler/dev-stack). Run npm run dev:stack to look at it.')
  } finally {
    await stack.close()
  }
}

function timeTravel() {
  const at = Date.parse(option('--at') ?? '')
  if (Number.isNaN(at)) fail('Say when: --at 2026-10-16T09:30:00Z (any time in the last 30 days).')
  const restoreArgs = ['d1', 'time-travel', 'restore', DATABASE, `--timestamp=${Math.floor(at / 1000)}`, '-c', CONFIG]
  if (!flag('--yes')) {
    console.log(`Nothing changed. This would put the LIVE database back to ${new Date(at).toISOString()}, losing every change since:\n  npx wrangler ${restoreArgs.join(' ')}\nRun again with --yes to do it.`)
    return
  }
  console.log('The bookmark to undo this:')
  wrangler(['d1', 'time-travel', 'info', DATABASE, '-c', CONFIG])
  wrangler(restoreArgs)
}

async function restoreFilesCmd() {
  const site = option('--site')?.replace(/^https?:\/\//, '').split(/[./]/)[0]
  const ref = option('--ref')
  if (!site === !ref) fail('Say which site: --site <address> or --ref <id>.')
  const from = option('--from')
  const dryRun = !flag('--yes')
  const r = await postJson<{ files: { key: string; written: string }[]; restored: number; prefixes: string[] }>(
    '/v1/admin/backups/restore-files', { ...(site ? { slug: site } : { ref }), ...(from ? { at: from } : {}), dryRun },
  )
  console.log(r.files.map(f => `  ${f.key}  (written ${f.written})`).join('\n') || '  no backed-up files')
  console.log(dryRun
    ? `\n${r.files.length} file(s) would be put back (${r.prefixes.join(', ') || 'no folders found'}). Nothing changed: run again with --yes.`
    : `\n${r.restored} file(s) put back.`)
}

const COMMANDS: Record<string, () => unknown> = { list, verify, run, 'restore-db': restoreDb, 'time-travel': timeTravel, 'restore-files': restoreFilesCmd }
const command = COMMANDS[args[0] ?? ''] ?? fail(`Commands: ${Object.keys(COMMANDS).join(', ')}. See the top of scripts/backup.ts.`)
try {
  await command()
} catch (err) {
  fail(err instanceof Error ? err.message : String(err))
}
