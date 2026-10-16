// Lists, and deletes for good, test sites before launch (server/core/testSites.ts).
// The server refuses to delete anything once LAUNCHED is true.
//
//   npm run test-sites                      list every published or paid site
//   npm run test-sites -- delete <ref|url>  delete these (shows them, then needs --yes)
//   npm run test-sites -- delete --all      delete every one of them (needs --yes)
//
// The admin key and --api: see scripts/admin-api.mjs. Taking a live site down (abuse) after launch
// is `npm run site` instead (scripts/site.mjs).
import { adminApi } from './admin-api.mjs'

const args = process.argv.slice(2)
const flag = name => args.includes(name)
const option = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const { call } = adminApi(args)

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
