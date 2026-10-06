import { z } from 'zod'
import { builderUrl, siteOrigin } from './config'
import type { Config } from './config'
import { sendQuietly } from './email'
import { editLinksEmail, refundEmail, welcomeEmail } from './emails'
import { HttpError, json, readJson } from './http'
import { rateLimit, SIZE } from './limits'
import type { Deps, DraftRow } from './ports'
import { paymentsOn } from './checkout'
import { takeDown } from './publish'
import { linkRef, signLink, verifyLink } from './tokens'

/** After paying: the welcome email, edit links, and self-serve refunds within the guarantee. */

const DAY = 24 * 60 * 60 * 1000

function linkSecret(c: Config): string {
  if (!c.linkSecret) throw new HttpError(503, 'payments_closed', 'This isn’t switched on yet.')
  return c.linkSecret
}

export const editLink = async (c: Config, d: Pick<DraftRow, 'ref' | 'linkVersion'>): Promise<string> =>
  `${builderUrl(c)}#edit=${await signLink(linkSecret(c), 'edit', d.ref, d.linkVersion)}`
export const refundLink = async (c: Config, ref: string): Promise<string> => `${builderUrl(c)}#refund=${await signLink(linkSecret(c), 'refund', ref)}`

/** Sends the welcome email once per paid site (whichever webhook delivery gets there first). */
export async function sendWelcome(deps: Deps, draft: DraftRow): Promise<void> {
  const p = draft.payment
  if (!p || !draft.slug || !(await deps.db.claimWelcome(draft.ref, deps.now()))) return
  let receiptUrl: string | null = null
  try {
    receiptUrl = await paymentsOn(deps).receiptUrl(p.paymentIntent)
  } catch (err) {
    console.error('No receipt link from Stripe', err)
  }
  const sent = await sendQuietly(deps.mailer, welcomeEmail(deps.config, {
    to: p.email, siteUrl: `${siteOrigin(deps.config, draft.slug)}/`, editLink: await editLink(deps.config, draft),
    refundLink: await refundLink(deps.config, draft.ref), amount: p.amount, paidAt: p.paidAt, reference: draft.ref.slice(0, 8).toUpperCase(), receiptUrl,
  }))
  // Not sent: give the claim back, and fail so Stripe delivers the event again later.
  if (!sent) {
    await deps.db.releaseWelcome(draft.ref)
    throw new Error(`Welcome email for ${draft.ref} not sent`)
  }
}

/**
 * Marks a site refunded and takes it down. Safe to call again (the refund link, then Stripe's
 * charge.refunded webhook for the same refund): only the first call sends the email.
 */
export async function refundedAndDown(deps: Deps, draft: DraftRow, refundId: string | null): Promise<void> {
  const first = await deps.db.markRefunded(draft.ref, deps.now(), refundId)
  if (draft.slug) await takeDown(deps, draft.slug)
  if (first && draft.payment) {
    await sendQuietly(deps.mailer, refundEmail(deps.config, draft.payment.email, `${siteOrigin(deps.config, draft.slug ?? '')}/`, draft.payment.amount))
  }
}

const tokenBody = z.object({ token: z.string().max(200) })

type RefundState =
  | { state: 'ok'; draft: DraftRow; amount: number; siteUrl: string; until: string }
  | { state: 'used' }
  | { state: 'expired'; support: string }

async function refundState(req: Request, deps: Deps): Promise<RefundState> {
  const parsed = tokenBody.safeParse(await readJson(req, SIZE.smallJson))
  const token = parsed.success ? parsed.data.token : ''
  const ref = linkRef('refund', token)
  const genuine = !!ref && (await verifyLink(linkSecret(deps.config), 'refund', token))
  const draft = genuine ? await deps.db.draftByRef(ref!) : null
  if (!draft?.payment) throw new HttpError(404, 'unknown_link', 'That refund link isn’t right. Check it’s the whole link from your email.')
  if (draft.refundedAt) return { state: 'used' }
  const until = draft.payment.paidAt + deps.config.refundDays * DAY
  if (deps.now() > until) return { state: 'expired', support: deps.config.email.support.replace(/^.*<([^>]+)>$/, '$1') }
  return { state: 'ok', draft, amount: draft.payment.amount, siteUrl: draft.slug ? `${siteOrigin(deps.config, draft.slug)}/` : '', until: new Date(until).toISOString() }
}

/** POST /v1/refund/status {token}: what the refund link's page should say. */
export async function refundStatus(req: Request, deps: Deps): Promise<Response> {
  await rateLimit(deps, req, 'refund')
  const s = await refundState(req, deps)
  if (s.state !== 'ok') return json(s)
  return json({ state: 'ok', amount: s.amount, siteUrl: s.siteUrl, until: s.until })
}

/** POST /v1/refund {token}: refunds in full through Stripe, takes the site down, emails a confirmation. */
export async function refund(req: Request, deps: Deps): Promise<Response> {
  await rateLimit(deps, req, 'refund')
  const s = await refundState(req, deps)
  if (s.state !== 'ok') return json(s, 409)
  // One refund per payment, however many times this is pressed.
  const { id } = await paymentsOn(deps).refund(s.draft.payment!.paymentIntent, `refund-${s.draft.payment!.paymentIntent}`)
  await refundedAndDown(deps, s.draft, id)
  return json({ state: 'refunded', amount: s.amount })
}

const emailBody = z.object({ email: z.string().trim().email().max(254) })

/**
 * POST /v1/edit-link {email}: "Lost your edit link?". Sends fresh links to the payment email
 * only, and answers the same whether or not that email paid for anything.
 */
export async function requestEditLink(req: Request, deps: Deps): Promise<Response> {
  await rateLimit(deps, req, 'editLink')
  const parsed = emailBody.safeParse(await readJson(req, SIZE.smallJson))
  if (!parsed.success) throw new HttpError(422, 'invalid_email', "That email doesn't look right. Check for a missing @ or dot.")
  linkSecret(deps.config)
  const sites = (await deps.db.paidDraftsByEmail(parsed.data.email)).filter(d => !d.refundedAt && d.slug)
  if (sites.length) {
    const now = deps.now()
    const links = await Promise.all(sites.map(async d => {
      // A fresh link cuts off the old ones (in case one was shared or left on another device).
      const linkVersion = await deps.db.bumpLinkVersion(d.ref)
      const until = d.payment!.paidAt + deps.config.refundDays * DAY
      return {
        siteUrl: `${siteOrigin(deps.config, d.slug!)}/`, editLink: await editLink(deps.config, { ref: d.ref, linkVersion }),
        refund: now <= until ? { link: await refundLink(deps.config, d.ref), until } : null,
      }
    }))
    await sendQuietly(deps.mailer, editLinksEmail(deps.config, sites[0].payment!.email, links))
  }
  return json({ sent: true, message: 'If that email paid for a site, a new edit link is on its way. Check your inbox and spam folder.' })
}
