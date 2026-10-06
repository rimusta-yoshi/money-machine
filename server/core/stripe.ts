import { HttpError } from './http'
import type { Payments } from './ports'

/**
 * Stripe over plain fetch (no SDK): Checkout Sessions, refunds and webhook signatures.
 * Runs on any host with web-standard fetch and WebCrypto.
 */

const API = 'https://api.stripe.com'
/** Signed webhooks older than this are refused (Stripe's own default). */
const TOLERANCE_SEC = 5 * 60

/** Stripe's form encoding: nested keys as a[b][c]=v. */
function form(values: Record<string, unknown>, prefix = '', out = new URLSearchParams()): URLSearchParams {
  for (const [k, v] of Object.entries(values)) {
    const key = prefix ? `${prefix}[${k}]` : k
    if (v === undefined || v === null) continue
    if (typeof v === 'object') form(v as Record<string, unknown>, key, out)
    else out.append(key, String(v))
  }
  return out
}

export function stripePayments(secretKey: string, fetcher: typeof fetch = (...a) => fetch(...a)): Payments {
  async function call<T>(method: 'GET' | 'POST', path: string, body?: Record<string, unknown>, idempotencyKey?: string): Promise<T> {
    const headers: Record<string, string> = { Authorization: `Bearer ${secretKey}` }
    if (body) headers['Content-Type'] = 'application/x-www-form-urlencoded'
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey
    let res: Response
    try {
      res = await fetcher(`${API}${path}`, { method, headers, body: body ? form(body).toString() : undefined })
    } catch (err) {
      console.error('Stripe could not be reached', err)
      throw new HttpError(502, 'payments_unavailable', 'Card payments are not answering just now. Please try again in a minute.')
    }
    const json = await res.json().catch(() => ({})) as { error?: { message?: string; type?: string } }
    if (!res.ok) {
      // Stripe's message is for us, not the customer.
      console.error(`Stripe ${method} ${path} failed (${res.status})`, json.error?.type, json.error?.message)
      throw new HttpError(502, 'payments_failed', 'Card payments are not working just now. Please try again in a minute.')
    }
    return json as T
  }

  return {
    async createCheckout(c) {
      const session = await call<{ id: string; url: string }>('POST', '/v1/checkout/sessions', {
        mode: 'payment',
        customer_email: c.email,
        client_reference_id: c.ref,
        metadata: { ref: c.ref, slug: c.slug },
        payment_intent_data: { metadata: { ref: c.ref, slug: c.slug }, receipt_email: c.email },
        line_items: { 0: { quantity: 1, price_data: { currency: c.currency, unit_amount: c.amount, product_data: { name: c.productName } } } },
        success_url: c.successUrl,
        cancel_url: c.cancelUrl,
        expires_at: Math.floor(c.expiresAt / 1000),
      })
      return { id: session.id, url: session.url }
    },
    async refund(paymentIntent, idempotencyKey) {
      const refund = await call<{ id: string }>('POST', '/v1/refunds', { payment_intent: paymentIntent, reason: 'requested_by_customer' }, idempotencyKey)
      return { id: refund.id }
    },
    async receiptUrl(paymentIntent) {
      const pi = await call<{ latest_charge?: { receipt_url?: string } | string | null }>('GET', `/v1/payment_intents/${encodeURIComponent(paymentIntent)}?expand[]=latest_charge`)
      return typeof pi.latest_charge === 'object' ? pi.latest_charge?.receipt_url ?? null : null
    },
  }
}

const hex = (bytes: ArrayBuffer): string => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('')

/** Constant-time comparison of two hex strings. */
function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** The signature Stripe puts on a webhook body (also used by the tests to sign their own events). */
export async function stripeSignature(secret: string, timestamp: number, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`)))
}

/**
 * Checks a Stripe-Signature header (t=<seconds>,v1=<hex>[,v1=…]) against the raw body.
 * True only for a genuine, recent signature.
 */
export async function verifyStripeSignature(secret: string, header: string | null, payload: string, nowMs: number): Promise<boolean> {
  if (!header) return false
  const parts = header.split(',').map(p => p.trim().split('='))
  const t = Number(parts.find(([k]) => k === 't')?.[1])
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v ?? '')
  if (!Number.isInteger(t) || !signatures.length) return false
  if (Math.abs(nowMs / 1000 - t) > TOLERANCE_SEC) return false
  const expected = await stripeSignature(secret, t, payload)
  return signatures.some(s => sameHex(s, expected))
}
