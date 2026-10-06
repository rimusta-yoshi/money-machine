import { stripeSignature } from '../core/stripe'

/**
 * Stands in for Stripe and Resend in the tests: answers the API worker's outgoing requests
 * and remembers them, and makes signed webhook events like Stripe's.
 */

export const STRIPE_KEY = 'sk_test_fake0123456789'
export const WEBHOOK_SECRET = 'whsec_fake0123456789abcdef'
export const LINK_SECRET = 'test-link-secret-0123456789abcdefghij'
export const RESEND_KEY = 're_fake0123456789'

export interface FakeSession { id: string; ref: string; slug: string; email: string; amount: number; currency: string; successUrl: string; cancelUrl: string; paymentIntent: string }
export interface SentEmail { from: string; to: string[]; subject: string; html: string; text: string }

let n = 0
const id = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(++n).toString().padStart(6, '0')}abcdef`

export function fakeStripe() {
  const sessions = new Map<string, FakeSession>()
  const refunds = new Map<string, { id: string; paymentIntent: string }>()
  const emails: SentEmail[] = []
  let failRefunds = false
  let failEmails = false

  async function handle(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
    if (url.host === 'api.resend.com' && url.pathname === '/emails') {
      if (req.headers.get('Authorization') !== `Bearer ${RESEND_KEY}`) return reply({ message: 'bad key' }, 401)
      if (failEmails) return reply({ message: 'down' }, 500)
      emails.push(await req.json() as SentEmail)
      return reply({ id: id('email') })
    }
    if (url.host !== 'api.stripe.com') return reply({ error: `unexpected request to ${url.host}` }, 500)
    if (req.headers.get('Authorization') !== `Bearer ${STRIPE_KEY}`) return reply({ error: { type: 'invalid_request_error', message: 'bad key' } }, 401)
    if (req.method === 'POST' && url.pathname === '/v1/checkout/sessions') {
      const f = new URLSearchParams(await req.text())
      const s: FakeSession = {
        id: id('cs_test'), ref: f.get('metadata[ref]')!, slug: f.get('metadata[slug]')!, email: f.get('customer_email')!,
        amount: Number(f.get('line_items[0][price_data][unit_amount]')), currency: f.get('line_items[0][price_data][currency]')!,
        successUrl: f.get('success_url')!, cancelUrl: f.get('cancel_url')!, paymentIntent: id('pi_test'),
      }
      sessions.set(s.id, s)
      return reply({ id: s.id, url: `https://checkout.stripe.test/c/pay/${s.id}` })
    }
    if (req.method === 'POST' && url.pathname === '/v1/refunds') {
      if (failRefunds) return reply({ error: { type: 'api_error', message: 'down' } }, 500)
      const key = req.headers.get('Idempotency-Key') ?? id('nokey')
      const pi = new URLSearchParams(await req.text()).get('payment_intent')!
      if (!refunds.has(key)) refunds.set(key, { id: id('re_test'), paymentIntent: pi })
      return reply({ id: refunds.get(key)!.id, status: 'succeeded' })
    }
    const pi = /^\/v1\/payment_intents\/([^/]+)$/.exec(url.pathname)?.[1]
    if (req.method === 'GET' && pi) return reply({ id: pi, latest_charge: { id: `ch_${pi}`, receipt_url: `https://pay.stripe.test/receipts/${pi}` } })
    return reply({ error: { type: 'invalid_request_error', message: `no such route ${req.method} ${url.pathname}` } }, 404)
  }

  /** A signed webhook request, as Stripe would send it. */
  async function webhook(api: string, event: unknown, o: { secret?: string; at?: number; header?: string | null } = {}): Promise<[string, RequestInit]> {
    const payload = JSON.stringify(event)
    const t = Math.floor((o.at ?? Date.now()) / 1000)
    const header = o.header !== undefined ? o.header : `t=${t},v1=${await stripeSignature(o.secret ?? WEBHOOK_SECRET, t, payload)}`
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (header !== null) headers['Stripe-Signature'] = header
    return [`${api}/v1/stripe/webhook`, { method: 'POST', headers, body: payload }]
  }

  const completed = (sessionId: string, o: { eventId?: string; paymentStatus?: string } = {}) => {
    const s = sessions.get(sessionId)!
    return {
      id: o.eventId ?? id('evt'), type: 'checkout.session.completed',
      data: { object: { id: s.id, object: 'checkout.session', payment_status: o.paymentStatus ?? 'paid', payment_intent: s.paymentIntent, amount_total: s.amount, currency: s.currency, client_reference_id: s.ref, customer_email: s.email, metadata: { ref: s.ref, slug: s.slug } } },
    }
  }

  const chargeRefunded = (paymentIntent: string, o: { full?: boolean; eventId?: string } = {}) => ({
    id: o.eventId ?? id('evt'), type: 'charge.refunded',
    data: { object: { id: `ch_${paymentIntent}`, object: 'charge', payment_intent: paymentIntent, refunded: o.full ?? true, refunds: { data: [{ id: id('re_dash') }] } } },
  })

  return {
    handle, webhook, completed, chargeRefunded, sessions, refunds, emails,
    failRefunds: (on: boolean) => { failRefunds = on },
    failEmails: (on: boolean) => { failEmails = on },
    lastSession: () => [...sessions.values()].at(-1)!,
    emailsTo: (to: string) => emails.filter(e => e.to.includes(to)),
  }
}

/** Settings that switch payments on in a test stack. */
export const PAYMENT_VARS = {
  STRIPE_SECRET_KEY: STRIPE_KEY,
  STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
  LINK_SECRET,
  RESEND_API_KEY: RESEND_KEY,
  APP_URL: 'https://app.siteblocks.test',
  BRAND_NAME: 'Test Blocks',
  EMAIL_FROM: 'Test Blocks <hello@siteblocks.test>',
  SUPPORT_EMAIL: 'help@siteblocks.test',
}
