import type { Deps } from './ports'

/**
 * Stripe's fee on each sale, for the dashboard's net after fees. Read from the payment's balance
 * transaction once it's paid (never holding up the webhook), and again by the daily cron for any
 * Stripe hadn't settled yet. A failure only leaves the fee unknown for now.
 */

/** Enough for any day; the rest waits for tomorrow. */
const BACKFILL = 50

async function fetchAndRecord(deps: Deps, ref: string, paymentIntent: string): Promise<boolean> {
  if (!deps.payments) return false
  const fee = await deps.payments.fee(paymentIntent)
  if (fee === null) return false
  await deps.db.recordFee(ref, fee)
  return true
}

/** After a payment: records its fee in the background. */
export function recordFeeLater(deps: Deps, ref: string, paymentIntent: string): void {
  deps.later(fetchAndRecord(deps, ref, paymentIntent))
}

/** Daily: fees not known yet. Returns how many were filled in. */
export async function backfillFees(deps: Deps): Promise<number> {
  let filled = 0
  for (const p of await deps.db.paidWithoutFee(BACKFILL)) {
    try {
      if (await fetchAndRecord(deps, p.ref, p.paymentIntent)) filled++
    } catch (err) {
      console.warn(`Stripe fee for ${p.ref} not read`, err)
    }
  }
  return filled
}
