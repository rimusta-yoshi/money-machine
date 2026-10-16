import { paymentsOn } from './checkout'
import { sendQuietly } from './email'
import { paymentRefundedEmail } from './emails'
import type { Deps, DraftRow } from './ports'

/**
 * A checkout that completes for a site taken down meanwhile (abuse, server/core/takedown.ts):
 * we won't show the site, so we don't keep the money. The payment is refunded in full at once,
 * noted on the site's take-down log, and the payer gets one short email. The payment is never
 * recorded on the site, so it stays unpaid: a later restore brings back an unpaid draft, not a
 * paid site. The customer's own refund link isn't involved (it stays blocked while a site is down).
 */

export interface PaidCheckout { sessionId: string; paymentIntent: string; email: string; amount: number }

/** Whether this payment (or checkout) was already refunded this way (a webhook retried after a restore, say). */
export async function refundedForTakedown(deps: Deps, ref: string, by: { paymentIntent: string } | { sessionId: string }): Promise<boolean> {
  const record = await deps.db.takedownRecord(ref)
  return !!record?.log.some(e => e.action === 'refunded'
    && ('paymentIntent' in by ? e.paymentIntent === by.paymentIntent : e.sessionId === by.sessionId))
}

/**
 * Notes the refund first, so a retry (even after a restore) comes back here rather than
 * publishing; then refunds (Stripe's idempotency key makes a retry the same refund); then
 * emails the payer once. Never publishes and never sends the welcome.
 */
export async function refundTakenDown(deps: Deps, draft: DraftRow, paid: PaidCheckout): Promise<void> {
  console.warn(`Site ${draft.ref} paid while taken down; refunding ${paid.paymentIntent}`)
  await deps.db.noteTakedownRefund(draft.ref, { now: deps.now(), sessionId: paid.sessionId, paymentIntent: paid.paymentIntent })
  const { id } = await paymentsOn(deps).refund(paid.paymentIntent, `takedown-${paid.paymentIntent}`)
  if (await deps.db.claimTakedownRefundEmail(draft.ref, { now: deps.now(), paymentIntent: paid.paymentIntent, refundId: id })) {
    await sendQuietly(deps.mailer, paymentRefundedEmail(deps.config, paid.email, paid.amount))
  }
}
