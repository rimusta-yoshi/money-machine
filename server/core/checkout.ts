import { z } from 'zod'
import { builderUrl, siteOrigin } from './config'
import { authDraft, storedRecord } from './drafts'
import { HttpError, json, readJson } from './http'
import { rateLimit, SIZE } from './limits'
import type { Deps, Payments } from './ports'
import { checkReady, sitePhotoFiles, suggestion, validSlug } from './publish'
import { sameSecret } from './tokens'

const MINUTE = 60 * 1000
/** Stripe needs at least 30 minutes; a minute more allows for clocks that differ. */
export const CHECKOUT_MINUTES = 31
/** The address stays held a while after the checkout closes, for a late webhook. */
export const HOLD_MINUTES = 45

export function paymentsOn(deps: Deps): Payments {
  if (!deps.payments) throw new HttpError(503, 'payments_closed', 'Card payments aren’t open yet. Your site is kept in this browser, so you can go live as soon as they are.')
  return deps.payments
}

const checkoutBody = z.object({ slug: z.string().max(64), testerCode: z.string().max(100).optional() })

/** Before launch only testers (with the tester code) can check out. */
async function requireLaunchedOrTester(deps: Deps, code: string | undefined): Promise<void> {
  if (deps.config.launched) return
  const expected = deps.config.testerCode
  if (!expected || !code || !(await sameSecret(code.trim(), expected))) {
    throw new HttpError(403, 'not_launched', 'We’re not taking orders yet. Your site is kept in this browser, so you can go live as soon as we are.')
  }
}

/** GET /v1/config: what the builder shows about paying. The price is said only here (and in the server's config). */
export async function shopConfig(_req: Request, deps: Deps): Promise<Response> {
  const c = deps.config
  return json({ pricePence: c.pricePence, currency: c.currency, launched: c.launched, refundDays: c.refundDays }, 200, { 'Cache-Control': 'public, max-age=300' })
}
const emailSchema = z.string().trim().email().max(254)

/**
 * POST /v1/draft/checkout: opens a Stripe Checkout for the saved, checked record at the
 * address asked for. The price comes from config, never from the caller. The address is
 * held while the checkout is open so nobody else can pay for it.
 */
export async function createCheckout(req: Request, deps: Deps): Promise<Response> {
  await rateLimit(deps, req, 'checkout')
  const parsed = checkoutBody.safeParse(await readJson(req, SIZE.smallJson))
  if (!parsed.success) throw new HttpError(422, 'invalid_slug', 'Choose an address for your site.')
  await requireLaunchedOrTester(deps, parsed.data.testerCode)
  const payments = paymentsOn(deps)
  const draft = await authDraft(req, deps)
  if (draft.refundedAt) throw new HttpError(403, 'refunded', 'This site was refunded and taken down.')
  if (draft.payment) throw new HttpError(409, 'already_paid', 'This site is paid for already. Use Publish changes to put your edits live.')
  const slug = validSlug(parsed.data.slug)
  const site = checkReady(storedRecord(draft))
  const email = emailSchema.safeParse(site.business.email)
  if (!email.success) throw new HttpError(422, 'invalid_email', "That email doesn't look right. Check for a missing @ or dot.")
  // A missing photo is found now, not after the card is charged.
  await sitePhotoFiles(deps, draft.ref, site)

  const now = deps.now()
  if (!(await deps.db.claimSlug(slug, draft.ref, now, now + HOLD_MINUTES * MINUTE))) {
    throw new HttpError(409, 'slug_taken', 'That address is taken.', { suggestion: await suggestion(deps, draft.ref, site) })
  }
  // One held address per site: trying another lets the last one go.
  await deps.db.releaseHolds(draft.ref, slug)
  const c = deps.config
  const expiresAt = now + CHECKOUT_MINUTES * MINUTE
  const session = await payments.createCheckout({
    ref: draft.ref, slug, email: email.data, amount: c.pricePence, currency: c.currency,
    productName: `${c.brandName} website: ${slug}.${c.baseDomain.replace(/:\d+$/, '')}`,
    successUrl: `${builderUrl(c)}?paid={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${builderUrl(c)}?checkout=cancelled`,
    expiresAt,
  })
  await deps.db.createCheckout({ sessionId: session.id, ref: draft.ref, slug, email: email.data, record: JSON.stringify(site), createdAt: now, expiresAt })
  return json({ url: session.url }, 201)
}

export const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,250}$/

/**
 * GET /v1/checkouts/<session id>: the "publishing your site…" page polls this until the
 * webhook has put the site live. Says only what the address will show anyway.
 */
export async function checkoutStatus(req: Request, deps: Deps, sessionId: string): Promise<Response> {
  await rateLimit(deps, req, 'checkoutStatus')
  const checkout = SESSION_ID.test(sessionId) ? await deps.db.checkout(sessionId) : null
  if (!checkout) throw new HttpError(404, 'unknown_checkout', 'We could not find that payment.')
  const draft = await deps.db.draftByRef(checkout.ref)
  if (!draft) throw new HttpError(404, 'unknown_checkout', 'We could not find that payment.')
  if (draft.refundedAt) return json({ state: 'refunded' })
  const live = draft.payment?.sessionId === sessionId && draft.slug && draft.publishedAt && draft.publishedAt >= draft.payment.paidAt
  return json(live ? { state: 'live', url: `${siteOrigin(deps.config, draft.slug!)}/` } : { state: 'waiting' })
}
