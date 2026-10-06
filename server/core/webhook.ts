import { parseSite } from '../../src/site/parse'
import { refundedAndDown, sendWelcome } from './account'
import { paymentsOn } from './checkout'
import { HttpError, json, readBody } from './http'
import { SIZE } from './limits'
import type { Deps } from './ports'
import { putLive, suggestion } from './publish'
import { verifyStripeSignature } from './stripe'

/**
 * POST /v1/stripe/webhook: the only thing that puts a paid site live (and takes a refunded
 * one down). Signed by Stripe; every event is handled at most once, and each step is safe to
 * repeat, so a retry after a failure finishes the job.
 */

interface StripeEvent { id: string; type: string; data: { object: Record<string, unknown> } }

interface Session {
  id: string; payment_status?: string; payment_intent?: string | null; amount_total?: number | null; currency?: string | null
  client_reference_id?: string | null; metadata?: Record<string, string> | null
}

interface Charge { payment_intent?: string | null; refunded?: boolean; refunds?: { data?: { id: string }[] } | null }

export async function stripeWebhook(req: Request, deps: Deps): Promise<Response> {
  const stripe = deps.config.stripe
  if (!stripe) throw new HttpError(404, 'not_found', 'Not found.')
  const payload = new TextDecoder().decode(await readBody(req, SIZE.webhook))
  if (!(await verifyStripeSignature(stripe.webhookSecret, req.headers.get('Stripe-Signature'), payload, deps.now()))) {
    throw new HttpError(400, 'bad_signature', 'Signature missing or invalid.')
  }
  let event: StripeEvent
  try {
    event = JSON.parse(payload) as StripeEvent
  } catch {
    throw new HttpError(400, 'bad_json', 'That request could not be read.')
  }
  if (typeof event.id !== 'string' || typeof event.type !== 'string' || !event.data?.object) throw new HttpError(400, 'bad_event', 'Not a Stripe event.')
  if (await deps.db.eventSeen(event.id)) return json({ received: true, duplicate: true })

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      await paid(deps, event.data.object as unknown as Session)
      break
    case 'charge.refunded':
      await chargeRefunded(deps, event.data.object as Charge)
      break
    default:
      // Anything else the endpoint is sent is acknowledged and ignored.
      break
  }
  // Recorded only once handled: a failure above is retried by Stripe.
  await deps.db.recordEvent(event.id, event.type, deps.now())
  return json({ received: true })
}

/** A completed, paid checkout: record the payment, put the site live, send the welcome email. */
async function paid(deps: Deps, session: Session): Promise<void> {
  if (session.payment_status !== 'paid') return
  const checkout = await deps.db.checkout(session.id)
  const ref = session.metadata?.ref ?? session.client_reference_id
  // Not one of ours (another product on the same Stripe account), or tampered with.
  if (!checkout || checkout.ref !== ref) {
    console.warn(`Ignoring checkout ${session.id}: no matching checkout`)
    return
  }
  if (!session.payment_intent) {
    console.error(`Checkout ${session.id} paid without a payment intent`)
    return
  }
  const before = await deps.db.draftByRef(checkout.ref)
  if (!before || before.refundedAt) {
    // Paid (in another tab) for a site that is gone or refunded: the money goes straight back.
    console.error(`Checkout ${session.id} paid for a refunded or missing site; refunding ${session.payment_intent}`)
    await paymentsOn(deps).refund(session.payment_intent, `late-${session.payment_intent}`)
    return
  }
  const paidAt = deps.now()
  await deps.db.markPaid(checkout.ref, {
    sessionId: session.id, paymentIntent: session.payment_intent, amount: session.amount_total ?? 0,
    currency: session.currency ?? deps.config.currency, email: checkout.email, paidAt,
  })
  const draft = (await deps.db.draftByRef(checkout.ref))!
  if (draft.payment!.sessionId !== session.id) {
    // Paid twice for one site (two tabs): the second payment goes straight back.
    console.error(`Site ${draft.ref} paid twice; refunding ${session.payment_intent}`)
    await paymentsOn(deps).refund(session.payment_intent, `duplicate-${session.payment_intent}`)
    return
  }
  // Already live since paying (a repeat delivery, or edits published since): leave it.
  if (!(draft.slug && draft.publishedAt && draft.publishedAt >= draft.payment!.paidAt)) {
    const site = parseSite(JSON.parse(checkout.record))
    await deps.db.saveRecord(draft.ref, JSON.stringify(site), deps.now())
    try {
      await putLive(deps, draft, checkout.slug, site, { paid: true })
    } catch (err) {
      if (!(err instanceof HttpError && err.code === 'slug_taken')) throw err
      // The hold ran out before the payment landed and someone else took the address.
      const other = await suggestion(deps, draft.ref, site)
      if (!other) throw err
      console.error(`Site ${draft.ref}: ${checkout.slug} was taken; publishing at ${other}`)
      await putLive(deps, draft, other, site, { paid: true })
    }
  }
  await sendWelcome(deps, (await deps.db.draftByRef(draft.ref))!)
}

/** A full refund, from the refund link or the Stripe dashboard: the site comes down. */
async function chargeRefunded(deps: Deps, charge: Charge): Promise<void> {
  if (!charge.payment_intent) return
  if (!charge.refunded) {
    // Partial refunds (made by hand in the dashboard) leave the site up.
    console.warn(`Partial refund on ${charge.payment_intent}: site left up`)
    return
  }
  const draft = await deps.db.draftByPaymentIntent(charge.payment_intent)
  if (!draft) return
  await refundedAndDown(deps, draft, charge.refunds?.data?.[0]?.id ?? null)
}
