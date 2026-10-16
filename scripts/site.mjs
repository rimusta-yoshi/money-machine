// Looks up, takes down and restores one live site (server/core/takedown.ts), with the admin key.
// For abuse reports: see docs/pm/abuse-routine.md. Nothing is deleted, no refund is made and no
// email is sent; restore puts the site back exactly (a refund or a dispute still keeps it down).
//
//   npm run site -- show <address|ref>
//   npm run site -- takedown <address|ref> "<reason>"
//   npm run site -- restore <address|ref>
//
// <address> is name.localblocks.co.uk (or just name), or the customer's own domain (bare or www).
// --by <name> says who did it (default: script (<your login>)). --api <url> and the admin key: see
// scripts/admin-api.mjs.
import { userInfo } from 'node:os'
import { adminApi } from './admin-api.mjs'

const USAGE = 'Usage: npm run site -- show|takedown|restore <address|ref> ["<reason>"] [--by <name>] [--api <url>]'
const args = process.argv.slice(2)
const option = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const plain = args.filter((a, i) => !a.startsWith('--') && !['--api', '--by'].includes(args[i - 1]))
const [command, target, reason] = plain
if (!['show', 'takedown', 'restore'].includes(command) || !target) {
  console.error(USAGE)
  process.exit(1)
}
if (command === 'takedown' && !reason?.trim()) {
  console.error('Say why it is coming down, in quotes: npm run site -- takedown <address> "Phishing: copies a bank login page"')
  process.exit(1)
}

const { api, call } = adminApi(args)
const by = (option('--by') ?? `script (${userInfo().username})`).slice(0, 80)
const which = /^[0-9a-f]{32}$/.test(target) ? { ref: target } : { address: target }
const when = t => (t ? new Date(t).toISOString().replace('T', ' ').slice(0, 16) : '-')

function describe(s) {
  const state = s.takenDown ? 'TAKEN DOWN' : s.refunded ? 'refunded (down)' : s.disputeLost ? 'dispute lost (down)' : s.disputed ? 'disputed (down)' : s.paid ? 'paid, live' : s.published ? 'published (admin)' : 'not published'
  const t = s.takedown
  return [
    `${s.name ?? '(no name)'}  ${s.ref}`,
    `  address:     ${s.url ?? '-'}`,
    `  own domain:  ${s.ownDomain ? `${s.ownDomain.hostname} (${s.ownDomain.status})` : '-'}`,
    `  owner:       ${s.email ?? '-'}`,
    `  status:      ${state}`,
    ...(t?.log?.length ? [`  history:`, ...t.log.map(e => `    ${when(e.at)}  ${e.action.padEnd(8)}  ${e.by}${e.reason ? `  "${e.reason}"` : ''}`)] : []),
  ].join('\n')
}

if (command === 'show') {
  const { site } = await call(`/v1/admin/sites/lookup?${new URLSearchParams(which)}`)
  console.log(describe(site))
} else if (command === 'takedown') {
  const r = await call('/v1/admin/sites/takedown', { ...which, reason: reason.trim(), by })
  console.log(`Taken down (${api}).\n${describe(r.site)}`)
  if (r.site.ownDomain && !r.domainPaused) console.log('Its own domain could not be paused just now: the next background check (within 15 minutes) does it.')
  console.log('\nNo email was sent: reply to the owner by hand (docs/pm/abuse-routine.md).')
} else {
  const r = await call('/v1/admin/sites/restore', { ...which, by })
  console.log(`Restored (${api}).\n${describe(r.site)}`)
  if (r.stillDown) console.log('\nIt stays down all the same: it was refunded or has a payment dispute.')
  else if (r.site.ownDomain) console.log('\nIts own domain comes back once Cloudflare has checked it again (usually a few minutes).')
}
