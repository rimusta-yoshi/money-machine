import { z } from 'zod'
import { checkDomain } from '../../src/domains/domainName'
import { PROVIDER_NAMES, isProviderId, providerFromNameservers } from '../../src/domains/providers'
import { builderUrl, ourDomains, siteOrigin } from './config'
import type { Config } from './config'
import { applyUrl } from './domainConnect'
import { dropDomain, refreshDomain, resumeDomain } from './domainLifecycle'
import { authDraft } from './drafts'
import { HttpError, json, readJson } from './http'
import { rateLimit, SIZE } from './limits'
import type { CustomHostnames, Deps, DomainRow, DraftRow } from './ports'

/**
 * The customer's own domain, from the edit link (paid, live sites only):
 *
 * GET  /v1/draft/domain             the domain and how it's doing (asks Cloudflare, at most every 15 s)
 * POST /v1/draft/domain {domain}    connects one: checked, its domain company found, added to Cloudflare
 * POST /v1/draft/domain/disconnect  back to the free address
 */

/** The page's own refresh asks Cloudflare at most this often. */
const RECHECK_MS = 15_000
/** Domain Connect sends the customer back here (with state=… or error=…). */
export const RETURN_STATE = 'domain'
export const returnUrl = (c: Config): string => `${builderUrl(c)}?domain=back`

export interface DomainRecord { type: 'CNAME' | 'TXT'; name: string; value: string }

/** What the page shows. Never Cloudflare ids or anything about other sites. */
export interface DomainView {
  hostname: string
  domain: string
  /** The record's name at the domain company: www (or the subdomain's own part). */
  host: string
  apex: string | null
  status: DomainRow['status']
  /** The domain company, if we could tell (for its own steps), and its name. */
  provider: string | null
  providerName: string | null
  records: DomainRecord[]
  /** Where the hostname points now, when it isn't us yet. */
  pointsElsewhere: string | null
  /** One-click connecting, when their DNS provider takes our template. */
  oneClick: { name: string; url: string } | null
  /** We've seen the ownership TXT record (nothing is served at the domain before). */
  verified: boolean
  liveUrl: string | null
  checkedAt: number | null
}

function ownDomainsOn(deps: Deps): CustomHostnames {
  if (!deps.saas) throw new HttpError(503, 'domains_closed', 'Connecting your own domain isn’t switched on yet. Please try again soon.')
  return deps.saas
}

/** Own domains are for paid sites that are live (not refunded, no dispute open). */
function requireLiveSite(draft: DraftRow): void {
  if (draft.refundedAt) throw new HttpError(403, 'refunded', 'This site was refunded and taken down.')
  if (draft.disputedAt) throw new HttpError(403, 'disputed', 'Your site is down while a payment dispute with your bank is open. Get in touch and we’ll help.')
  if (!draft.payment || !draft.slug || !draft.publishedAt) throw new HttpError(409, 'not_live', 'You can connect your own domain once your site is live.')
}

export async function domainView(deps: Deps, row: DomainRow): Promise<DomainView> {
  const target = deps.saas ? deps.config.saas!.target : `domains.${deps.config.baseDomain}`
  const host = row.hostname.slice(0, -(row.domain.length + 1))
  // The ownership record's name as the domain company wants it: relative to the domain.
  const verifyName = row.verify?.name.endsWith(`.${row.domain}`) ? row.verify.name.slice(0, -(row.domain.length + 1)) : row.verify?.name
  const records: DomainRecord[] = [
    { type: 'CNAME', name: host, value: target },
    ...(row.apex ? [{ type: 'CNAME' as const, name: '@', value: target }] : []),
    ...(row.verify && verifyName ? [{ type: 'TXT' as const, name: verifyName, value: row.verify.value }] : []),
  ]
  const dc = deps.config.domainConnect
  const oneClick = row.dc && dc && row.verify && row.status === 'pending'
    ? { name: row.dc.name, url: await applyUrl(dc, row.dc, { domain: row.domain, host, verify: row.verify.value, redirectUri: returnUrl(deps.config), state: RETURN_STATE }) }
    : null
  return {
    hostname: row.hostname, domain: row.domain, host, apex: row.apex, status: row.status,
    provider: row.provider, providerName: isProviderId(row.provider) ? PROVIDER_NAMES[row.provider] : row.dc?.name ?? null,
    records, pointsElsewhere: row.dnsSeen && row.dnsSeen !== target ? row.dnsSeen : null, oneClick,
    verified: !!row.verifiedAt, liveUrl: row.status === 'active' ? `https://${row.hostname}/` : null, checkedAt: row.checkedAt,
  }
}

async function answer(deps: Deps, draft: DraftRow, row: DomainRow | null): Promise<Response> {
  return json({
    // One being removed is already disconnected, as far as the customer is concerned.
    domain: row && row.status !== 'removing' ? await domainView(deps, row) : null,
    freeUrl: draft.slug ? `${siteOrigin(deps.config, draft.slug)}/` : null,
    switchedOn: !!deps.saas,
    // Whether the form can be used at all: switched on, and a live paid site.
    available: !!deps.saas && !!draft.payment && !!draft.slug && !!draft.publishedAt && !draft.refundedAt && !draft.disputedAt,
  })
}

/** GET /v1/draft/domain */
export async function domainStatus(req: Request, deps: Deps): Promise<Response> {
  await rateLimit(deps, req, 'domainStatus')
  const draft = await authDraft(req, deps)
  let row = await deps.domains.byRef(draft.ref)
  const stale = !row?.checkedAt || deps.now() - row.checkedAt > RECHECK_MS
  if (row && stale && (row.status === 'pending' || row.status === 'active')) {
    row = await refreshDomain(deps, row).catch(err => {
      // Cloudflare unreachable for now: say what we last knew.
      console.warn(`Checking ${row!.hostname} failed`, err)
      return row
    })
  }
  return answer(deps, draft, row)
}

const connectBody = z.object({ domain: z.string().max(300) }).strict()

/** POST /v1/draft/domain {domain} */
export async function connectDomain(req: Request, deps: Deps): Promise<Response> {
  await rateLimit(deps, req, 'domain')
  const draft = await authDraft(req, deps)
  const saas = ownDomainsOn(deps)
  requireLiveSite(draft)
  const parsed = connectBody.safeParse(await readJson(req, SIZE.smallJson))
  if (!parsed.success) throw new HttpError(422, 'invalid_domain', 'Type the domain you own, like smithplumbing.co.uk.')
  const check = checkDomain(parsed.data.domain, ourDomains(deps.config))
  if (!check.ok) throw new HttpError(422, 'invalid_domain', check.message, { problem: check.problem })

  let existing = await deps.domains.byRef(draft.ref)
  if (existing?.status === 'removing') {
    // Disconnected, but Cloudflare wasn't told yet: try again now.
    await dropDomain(deps, draft.ref, { republish: false })
    existing = await deps.domains.byRef(draft.ref)
    if (existing) throw new HttpError(503, 'still_removing', 'We’re still disconnecting your old domain. Please try again in a few minutes.')
  }
  if (existing?.hostname === check.hostname) {
    // Paused by a dispute that's since been won: connecting it again puts it back.
    if (existing.status === 'paused') await resumeDomain(deps, draft.ref)
    return answer(deps, draft, await deps.domains.byRef(draft.ref))
  }
  if (existing) throw new HttpError(409, 'has_domain', `Your site is already connected to ${existing.hostname}. Disconnect it first to use another.`)

  const ns = await deps.dns.lookup(check.domain, 'NS')
  if (ns.status === 'nxdomain') {
    throw new HttpError(422, 'no_such_domain', `We can’t find ${check.domain}. Check the spelling. Only just bought it? It can take an hour or so to appear, so try again later.`)
  }
  const provider = providerFromNameservers(ns.answers)
  // Only Cloudflare's own DNS can point the bare domain at us (CNAME flattening); elsewhere it's forwarded to www.
  const apex = provider === 'cloudflare' && check.host === 'www' ? check.domain : null
  const dc = deps.domainConnect ? await deps.domainConnect.discover(check.domain) : null
  const inserted = await deps.domains.insert({ ref: draft.ref, hostname: check.hostname, domain: check.domain, apex, provider, dc, createdAt: deps.now() })
  if (!inserted) throw new HttpError(409, 'domain_taken', 'That domain is already connected to another site. If it’s yours, get in touch and we’ll sort it out.')

  try {
    const main = await saas.create(check.hostname)
    await deps.domains.update(draft.ref, { cfId: main.id, verify: main.verify })
    const bare = apex ? await saas.create(apex) : null
    if (bare) await deps.domains.update(draft.ref, { cfApexId: bare.id })
  } catch (err) {
    console.error(`Adding ${check.hostname} to Cloudflare failed`, err)
    await dropDomain(deps, draft.ref, { republish: false })
    throw new HttpError(502, 'domains_unavailable', 'We couldn’t set that up just now. Please try again in a few minutes.')
  }
  return answer(deps, draft, await deps.domains.byRef(draft.ref))
}

/** POST /v1/draft/domain/disconnect */
export async function disconnectDomain(req: Request, deps: Deps): Promise<Response> {
  await rateLimit(deps, req, 'domain')
  const draft = await authDraft(req, deps)
  await dropDomain(deps, draft.ref, { republish: true })
  return answer(deps, draft, null)
}
