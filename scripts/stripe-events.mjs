/** The Stripe events the API worker's webhook handles (server/core/webhook.ts). */
export const STRIPE_EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'charge.refunded',
  'charge.dispute.created',
  'charge.dispute.closed',
]

/** The Stripe CLI arguments that forward those events to the local dev stack. */
export const stripeListenArgs = port => ['listen', '--events', STRIPE_EVENTS.join(','), '--forward-to', `https://127.0.0.1:${port}/v1/stripe/webhook`, '--skip-verify']
