import { siteOrigin } from './config'
import { storedRecord } from './drafts'
import { sendQuietly } from './email'
import { domainLiveEmail } from './emails'
import type { Deps, DomainPatch, DomainRow } from './ports'
import { putLive } from './publish'
import { isLive } from './saas'

/**
 * A customer's own domain from pending to live and back off again. Cloudflare's answer (the
 * custom hostname and its certificate) is the only thing that says "live". Every step is safe
 * to repeat: the page, the cron and the payment webhooks may all reach the same domain.
 */

const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE
/** A domain still waiting this long is given up (the customer can connect it again any time). */
export const PENDING_DAYS = 30
/** Cloudflare for SaaS: this many custom hostnames are free, then $0.10 a month each. */
export const FREE_HOSTNAMES = 100
/** The background check: waiting domains every quarter of an hour at most, live ones daily. */
const PENDING_EVERY = 10 * MINUTE
const ACTIVE_EVERY = 20 * 60 * MINUTE
const BATCH = 50

/** Where the hostname points now (a CNAME target), if anywhere. A hint for the page only. */
async function pointsAt(deps: Deps, hostname: string): Promise<string | null> {
  const r = await deps.dns.lookup(hostname, 'CNAME')
  return r.status === 'ok' ? r.answers[0] ?? null : null
}

/** Puts a paid, live site up again, so its pages name the right address. */
async function republish(deps: Deps, ref: string): Promise<void> {
  const draft = await deps.db.draftByRef(ref)
  const site = draft ? storedRecord(draft) : null
  if (!draft?.payment || !draft.slug || !draft.publishedAt || draft.refundedAt || draft.disputedAt || !site) return
  await putLive(deps, draft, draft.slug, site, { paid: true })
}

async function sendLiveEmail(deps: Deps, row: DomainRow): Promise<void> {
  const draft = await deps.db.draftByRef(row.ref)
  if (!draft?.payment || !draft.slug || !(await deps.domains.claimLiveEmail(row.ref, deps.now()))) return
  await sendQuietly(deps.mailer, domainLiveEmail(deps.config, draft.payment.email, {
    url: `https://${row.hostname}/`, freeUrl: `${siteOrigin(deps.config, draft.slug)}/`,
    bareToForward: row.hostname === `www.${row.domain}` && !row.apex ? row.domain : null,
  }))
}

/**
 * Asks Cloudflare how a pending or live domain is doing, and acts on a change: live puts the
 * site up again under the domain and sends the one email; no longer pointing at us puts it
 * back on the free address. A hostname Cloudflare has lost is made again.
 */
export async function refreshDomain(deps: Deps, row: DomainRow): Promise<DomainRow> {
  if (!deps.saas || (row.status !== 'pending' && row.status !== 'active')) return row
  const now = deps.now()
  const info = (row.cfId ? await deps.saas.get(row.cfId) : null) ?? await deps.saas.create(row.hostname)
  const patch: DomainPatch = { cfId: info.id, checkedAt: now, dnsSeen: await pointsAt(deps, row.hostname) }
  if (row.status === 'pending' && isLive(info)) Object.assign(patch, { status: 'active', activeAt: now })
  // A certificate being renewed isn't a reason to go back: only the domain leaving us is.
  if (row.status === 'active' && info.status !== 'active') patch.status = 'pending'
  await deps.domains.update(row.ref, patch)
  const next = { ...row, ...patch }
  if (next.status !== row.status) {
    await republish(deps, row.ref)
    if (next.status === 'active') await sendLiveEmail(deps, next)
  }
  return next
}

async function offCloudflare(deps: Deps, row: DomainRow): Promise<void> {
  if (!deps.saas) throw new Error('Own domains are switched off (no CF_SAAS_TOKEN): cannot remove the hostname')
  for (const id of [row.cfId, row.cfApexId]) if (id) await deps.saas.remove(id)
}

/**
 * Takes a site's domain off Cloudflare and forgets it: disconnecting, refunds, lost disputes,
 * deleted sites. If Cloudflare can't be reached the domain is marked "removing" (never served)
 * and the cron finishes the job. A live site goes back to naming its free address.
 */
export async function dropDomain(deps: Deps, ref: string, o: { republish: boolean }): Promise<void> {
  const row = await deps.domains.byRef(ref)
  if (!row) return
  try {
    await offCloudflare(deps, row)
    await deps.domains.delete(ref)
  } catch (err) {
    console.error(`Removing ${row.hostname} from Cloudflare failed; the cron will retry`, err)
    await deps.domains.update(ref, { status: 'removing' })
  }
  if (o.republish && row.status === 'active') await republish(deps, ref)
}

/** A payment dispute opened: the domain comes off Cloudflare but is kept, to put back if it's won. */
export async function pauseDomain(deps: Deps, ref: string): Promise<void> {
  const row = await deps.domains.byRef(ref)
  if (!row || row.status === 'paused' || row.status === 'removing') return
  try {
    await offCloudflare(deps, row)
    await deps.domains.update(ref, { status: 'paused', cfId: null, cfApexId: null })
  } catch (err) {
    // Not served meanwhile (the site is down); the cron pauses it later.
    console.error(`Pausing ${row.hostname} failed; the cron will retry`, err)
  }
}

/** A dispute won: the domain goes back on Cloudflare, waiting until it's live again. */
export async function resumeDomain(deps: Deps, ref: string): Promise<void> {
  const row = await deps.domains.byRef(ref)
  if (row?.status !== 'paused' || !deps.saas) return
  try {
    const info = await deps.saas.create(row.hostname)
    const apex = row.apex ? await deps.saas.create(row.apex) : null
    await deps.domains.update(ref, { status: 'pending', cfId: info.id, cfApexId: apex?.id ?? null, checkedAt: null })
  } catch (err) {
    console.error(`Putting ${row.hostname} back failed; the owner can connect it again`, err)
  }
}

export interface DomainSweep { removed: number; paused: number; checked: number; gaveUp: number }

/**
 * The background check (cron): finishes removals, pauses domains of disputed sites, gives up
 * on domains left waiting for 30 days, and asks Cloudflare about waiting domains (and, daily,
 * live ones). `daily` adds the live ones.
 */
export async function sweepDomains(deps: Deps, o: { daily: boolean }): Promise<DomainSweep> {
  const now = deps.now()
  const out: DomainSweep = { removed: 0, paused: 0, checked: 0, gaveUp: 0 }
  for (const d of await deps.domains.ended(BATCH)) {
    await dropDomain(deps, d.ref, { republish: false })
    out.removed++
  }
  for (const d of await deps.domains.disputed(BATCH)) {
    await pauseDomain(deps, d.ref)
    out.paused++
  }
  const due = [
    ...await deps.domains.due(['pending'], now - PENDING_EVERY, BATCH),
    ...(o.daily ? await deps.domains.due(['active'], now - ACTIVE_EVERY, BATCH) : []),
  ]
  for (const d of due) {
    if (d.status === 'pending' && d.createdAt < now - PENDING_DAYS * DAY) {
      await dropDomain(deps, d.ref, { republish: false })
      out.gaveUp++
      continue
    }
    try {
      await refreshDomain(deps, d)
      out.checked++
    } catch (err) {
      console.warn(`Checking ${d.hostname} failed`, err)
    }
  }
  return out
}
