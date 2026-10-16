import { siteOrigin } from './config'
import { storedRecord } from './drafts'
import { sendQuietly } from './email'
import { domainLiveEmail } from './emails'
import type { Deps, DomainPatch, DomainRow, HostnameInfo } from './ports'
import { putLive } from './publish'
import { isLive } from './saas'

/**
 * A customer's own domain from pending to live and back off again. Cloudflare's answer (the
 * custom hostname and its certificate) says "live", and only once we've also seen the ownership
 * TXT record (so a CNAME alone can't claim someone else's domain). Every step is safe to repeat,
 * and every status change is conditional on the status it was read with: the page, the cron and
 * the payment webhooks may all reach the same domain at once.
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

/** Whether the ownership TXT record is in public DNS. */
async function ownershipSeen(deps: Deps, verify: { name: string; value: string } | null): Promise<boolean> {
  if (!verify) return false
  const r = await deps.dns.lookup(verify.name, 'TXT')
  return r.status === 'ok' && r.answers.some(a => a.trim() === verify.value)
}

/** Puts a paid, live site up again, so its pages name the right address. */
async function republish(deps: Deps, ref: string): Promise<void> {
  const draft = await deps.db.draftByRef(ref)
  const site = draft ? storedRecord(draft) : null
  if (!draft?.payment || !draft.slug || !draft.publishedAt || draft.refundedAt || draft.disputedAt || draft.takenDownAt || !site) return
  await putLive(deps, draft, draft.slug, site, { paid: true })
}

async function sendLiveEmail(deps: Deps, row: DomainRow): Promise<void> {
  const draft = await deps.db.draftByRef(row.ref)
  // Never to a taken-down site (the email can't be claimed later: it's sent once the domain is live again).
  if (!draft?.payment || !draft.slug || draft.takenDownAt || !(await deps.domains.claimLiveEmail(row.ref, deps.now()))) return
  await sendQuietly(deps.mailer, domainLiveEmail(deps.config, draft.payment.email, {
    url: `https://${row.hostname}/`, freeUrl: `${siteOrigin(deps.config, draft.slug)}/`,
    bareToForward: row.hostname === `www.${row.domain}` && !row.apex ? row.domain : null,
  }))
}

/** A hostname made for a row that changed meanwhile (removed, paused): taken off again, so we never pay for it. */
async function removeOrphan(deps: Deps, info: HostnameInfo): Promise<void> {
  await deps.saas?.remove(info.id).catch(err => console.error(`Removing orphan hostname ${info.hostname} failed`, err))
}

/**
 * Asks Cloudflare how a pending or live domain is doing, and acts on a change: live puts the
 * site up again under the domain and sends the one email; no longer pointing at us puts it
 * back on the free address. A hostname Cloudflare has lost is made again (only while the domain
 * is still pending or live; one made for a row that changed meanwhile is removed again).
 */
export async function refreshDomain(deps: Deps, row: DomainRow): Promise<DomainRow> {
  if (!deps.saas || (row.status !== 'pending' && row.status !== 'active')) return row
  const now = deps.now()
  const found = row.cfId ? await deps.saas.get(row.cfId) : null
  const info = found ?? await deps.saas.create(row.hostname)
  const verify = info.verify ?? row.verify
  const verifiedAt = row.verifiedAt ?? (await ownershipSeen(deps, verify) ? now : null)
  const patch: DomainPatch = { cfId: info.id, checkedAt: now, dnsSeen: await pointsAt(deps, row.hostname), verify, verifiedAt }
  if (row.status === 'pending' && isLive(info) && verifiedAt) Object.assign(patch, { status: 'active', activeAt: now })
  // A certificate being renewed isn't a reason to go back: only the domain leaving us is.
  if (row.status === 'active' && info.status !== 'active') patch.status = 'pending'
  if (!(await deps.domains.update(row.ref, patch, row.status))) {
    // Changed by someone else meanwhile (disconnected, paused, already live): their change stands.
    const current = await deps.domains.byRef(row.ref)
    // Made here for a row that's since gone or paused (and not the one another check stored): off again.
    if (!found && current?.cfId !== info.id && current?.cfApexId !== info.id) await removeOrphan(deps, info)
    return current ?? row
  }
  const next = { ...row, ...patch }
  if (next.status !== row.status) {
    await republish(deps, row.ref)
    if (next.status === 'active') await sendLiveEmail(deps, next)
  }
  return next
}

/** Takes a domain's hostnames off Cloudflare. Nothing to remove (never made, or paused) needs no Cloudflare at all. */
async function offCloudflare(deps: Deps, row: DomainRow): Promise<void> {
  const ids = [row.cfId, row.cfApexId].filter((id): id is string => !!id)
  if (!ids.length) return
  if (!deps.saas) throw new Error('Own domains are switched off (no CF_SAAS_TOKEN): cannot remove the hostname')
  for (const id of ids) await deps.saas.remove(id)
}

/**
 * Takes a site's domain off Cloudflare and forgets it: disconnecting, refunds, lost disputes,
 * deleted sites. If Cloudflare can't be reached the domain is marked "removing" (never served)
 * and the cron finishes the job. A live site goes back to naming its free address. True if the
 * domain is gone (or there was none).
 */
export async function dropDomain(deps: Deps, ref: string, o: { republish: boolean }): Promise<boolean> {
  const row = await deps.domains.byRef(ref)
  if (!row) return true
  let gone = true
  try {
    await offCloudflare(deps, row)
    await deps.domains.delete(ref)
  } catch (err) {
    console.error(`Removing ${row.hostname} from Cloudflare failed; the cron will retry`, err)
    await deps.domains.update(ref, { status: 'removing' })
    gone = false
  }
  if (o.republish && row.status === 'active') await republish(deps, ref)
  return gone
}

/** A payment dispute opened: the domain comes off Cloudflare but is kept, to put back if it's won. */
export async function pauseDomain(deps: Deps, ref: string): Promise<boolean> {
  const row = await deps.domains.byRef(ref)
  if (!row || row.status === 'paused' || row.status === 'removing') return false
  try {
    await offCloudflare(deps, row)
    return await deps.domains.update(ref, { status: 'paused', cfId: null, cfApexId: null }, row.status)
  } catch (err) {
    // Not served meanwhile (the site is down); the cron pauses it later.
    console.error(`Pausing ${row.hostname} failed; the cron will retry`, err)
    return false
  }
}

/**
 * A dispute won (or a paused domain connected again): the domain goes back on Cloudflare,
 * waiting until it's live again. Ownership already shown stays shown.
 */
export async function resumeDomain(deps: Deps, ref: string): Promise<boolean> {
  const row = await deps.domains.byRef(ref)
  if (row?.status !== 'paused' || !deps.saas) return false
  const made: HostnameInfo[] = []
  try {
    const info = await deps.saas.create(row.hostname)
    made.push(info)
    const apex = row.apex ? await deps.saas.create(row.apex) : null
    if (apex) made.push(apex)
    const patch: DomainPatch = { status: 'pending', cfId: info.id, cfApexId: apex?.id ?? null, verify: info.verify ?? row.verify, checkedAt: null }
    if (await deps.domains.update(ref, patch, 'paused')) return true
  } catch (err) {
    console.error(`Putting ${row.hostname} back failed; the cron will retry`, err)
  }
  // Not resumed after all: nothing left on Cloudflare for it.
  for (const info of made) await removeOrphan(deps, info)
  return false
}

export interface DomainSweep { removed: number; paused: number; resumed: number; checked: number; gaveUp: number }

/**
 * The background check (cron): finishes removals, pauses domains of disputed or taken-down sites, puts back
 * paused ones whose site is live again, gives up on domains left waiting for 30 days, and asks
 * Cloudflare about waiting domains (and, daily, live ones).
 */
export async function sweepDomains(deps: Deps, o: { daily: boolean }): Promise<DomainSweep> {
  const now = deps.now()
  const out: DomainSweep = { removed: 0, paused: 0, resumed: 0, checked: 0, gaveUp: 0 }
  for (const d of await deps.domains.ended(BATCH)) if (await dropDomain(deps, d.ref, { republish: false })) out.removed++
  for (const d of await deps.domains.disputed(BATCH)) if (await pauseDomain(deps, d.ref)) out.paused++
  for (const d of await deps.domains.resumable(BATCH)) if (await resumeDomain(deps, d.ref)) out.resumed++
  const due = [
    ...await deps.domains.due(['pending'], now - PENDING_EVERY, BATCH),
    ...(o.daily ? await deps.domains.due(['active'], now - ACTIVE_EVERY, BATCH) : []),
  ]
  for (const d of due) {
    if (d.status === 'pending' && d.createdAt < now - PENDING_DAYS * DAY) {
      if (await dropDomain(deps, d.ref, { republish: false })) out.gaveUp++
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
