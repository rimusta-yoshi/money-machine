// Lists, and deletes for good, test sites before launch (server/core/testSites.ts).
// The server refuses to delete anything once LAUNCHED is true.
//
//   npm run test-sites                      list every published or paid site
//   npm run test-sites -- delete <ref|url>  delete these (shows them, then needs --yes)
//   npm run test-sites -- delete --all      delete every one of them (needs --yes)
//
// The admin key comes from ADMIN_KEY, else admin-key.local (gitignored). --api <url> points it
// elsewhere, e.g. --api https://api.localblocks.localhost:8787 for the local dev stack.
import { existsSync, readFileSync } from 'node:fs'
import { request } from 'node:https'
import { join } from 'node:path'

const args = process.argv.slice(2)
const flag = name => args.includes(name)
const option = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const api = (option('--api') ?? 'https://api.localblocks.co.uk').replace(/\/+$/, '')
const keyFile = join(process.cwd(), 'admin-key.local')
const key = process.env.ADMIN_KEY?.trim() || (existsSync(keyFile) ? readFileSync(keyFile, 'utf8').trim() : '')
if (!key) {
  console.error('No admin key: set ADMIN_KEY or put it in admin-key.local.')
  process.exit(1)
}
// The local dev stack: *.localhost names go to this computer, with its self-signed certificate.
const local = new URL(api).hostname.endsWith('.localhost')
const lookup = (_host, opts, done) => (opts?.all ? done(null, [{ address: '127.0.0.1', family: 4 }]) : done(null, '127.0.0.1', 4))

function call(path, body) {
  const payload = body ? JSON.stringify(body) : undefined
  return new Promise((resolve, reject) => {
    const req = request(`${api}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'X-Admin-Key': key, ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}) },
      ...(local ? { lookup, rejectUnauthorized: false } : {}),
    }, res => {
      let text = ''
      res.setEncoding('utf8')
      res.on('data', chunk => { text += chunk })
      res.on('end', () => {
        let data = {}
        try { data = JSON.parse(text) } catch { /* not JSON */ }
        if (res.statusCode >= 400) {
          console.error(`${res.statusCode}: ${data.message ?? 'request failed'}`)
          process.exit(1)
        }
        resolve(data)
      })
    })
    req.on('error', reject)
    req.end(payload)
  })
}

const describe = s => `${s.ref}  ${s.url ?? '(no address)'}  ${[s.paid ? 'paid' : 'unpaid', s.refunded && 'refunded', s.disputed && 'disputed'].filter(Boolean).join(', ')}  ${s.email ?? ''}  ${s.createdAt.slice(0, 10)}`

const { sites, launched } = await call('/v1/admin/sites')
if (args[0] !== 'delete') {
  console.log(sites.length ? sites.map(describe).join('\n') : 'No published or paid sites.')
  console.log(`\n${sites.length} site(s). Launched: ${launched}.`)
  process.exit(0)
}

const all = flag('--all')
const wanted = args.slice(1).filter(a => !a.startsWith('--') && a !== option('--api'))
const chosen = all ? sites : sites.filter(s => wanted.some(w => w === s.ref || (s.url && s.url.replace(/\/$/, '') === w.replace(/\/$/, ''))))
const unknown = all ? [] : wanted.filter(w => !chosen.some(s => w === s.ref || (s.url && s.url.replace(/\/$/, '') === w.replace(/\/$/, ''))))
if (unknown.length) console.error(`Not found: ${unknown.join(', ')}`)
if (!chosen.length) {
  console.error('Nothing to delete.')
  process.exit(1)
}
console.log(`Will delete for good (records, files, photos, dashboard rows):\n${chosen.map(describe).join('\n')}`)
if (!flag('--yes')) {
  console.log('\nNothing deleted yet. Run the same command again with --yes to delete these.')
  process.exit(0)
}
const { deleted } = await call('/v1/admin/sites/delete', all ? { all: true } : { refs: chosen.map(s => s.ref) })
console.log(`Deleted ${deleted.length} site(s).`)
