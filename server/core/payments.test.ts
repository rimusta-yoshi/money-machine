import { describe, expect, it, vi } from 'vitest'
import { money, parseConfig } from './config'
import { logMailer, mailerFor, resendMailer, sendQuietly } from './email'
import { welcomeEmail } from './emails'
import { stripePayments, stripeSignature, verifyStripeSignature } from './stripe'
import { linkRef, signLink, verifyLink } from './tokens'

const env = { BASE_DOMAIN: 'siteblocks.co.uk' }
const stripe = { STRIPE_SECRET_KEY: 'sk_test_abc123', STRIPE_WEBHOOK_SECRET: 'whsec_abc123', LINK_SECRET: 'x'.repeat(32) }
const email = { to: 'jo@example.com', subject: 'Hello', html: '<p>Hi</p>', text: 'Hi' }

describe('payment settings', () => {
  it('has safe defaults: £99, 14 days, payments off', () => {
    expect(parseConfig(env)).toMatchObject({ pricePence: 9900, currency: 'gbp', refundDays: 14, stripe: null, linkSecret: null, appUrl: 'https://siteblocks.co.uk', brandName: 'siteblocks.co.uk' })
    expect(parseConfig({ ...env, ...stripe, BRAND_NAME: 'Local Blocks', APP_URL: 'http://localhost:5173/' })).toMatchObject({
      stripe: { secretKey: 'sk_test_abc123', webhookSecret: 'whsec_abc123' }, brandName: 'Local Blocks', appUrl: 'http://localhost:5173',
    })
  })

  it('refuses live keys unless switched on, and payments without a link secret', () => {
    expect(() => parseConfig({ ...env, ...stripe, STRIPE_SECRET_KEY: 'sk_live_abc123' })).toThrow(/live key/)
    expect(parseConfig({ ...env, ...stripe, STRIPE_SECRET_KEY: 'sk_live_abc123', STRIPE_ALLOW_LIVE: 'true' }).stripe?.secretKey).toBe('sk_live_abc123')
    expect(() => parseConfig({ ...env, ...stripe, LINK_SECRET: '' })).toThrow(/LINK_SECRET/)
    expect(() => parseConfig({ ...env, ...stripe, STRIPE_WEBHOOK_SECRET: '' })).toThrow(/WEBHOOK/)
    expect(() => parseConfig({ ...env, PRICE_PENCE: '99.5' })).toThrow()
    expect(() => parseConfig({ ...env, EMAIL_FROM: 'nobody' })).toThrow()
    expect(() => parseConfig({ ...env, APP_URL: 'https://siteblocks.co.uk/build' })).toThrow()
  })

  it('says prices plainly', () => {
    expect(money(9900)).toBe('£99')
    expect(money(9950)).toBe('£99.50')
  })
})

describe('signed links', () => {
  const ref = 'a'.repeat(32)
  it('verifies only genuine links for their own purpose', async () => {
    const token = await signLink('s'.repeat(32), 'edit', ref, 2)
    expect(linkRef('edit', token)).toBe(ref)
    expect(await verifyLink('s'.repeat(32), 'edit', token, 2)).toBe(true)
    // A newer link version cuts off this one.
    expect(await verifyLink('s'.repeat(32), 'edit', token, 3)).toBe(false)
    expect(await verifyLink('s'.repeat(32), 'refund', token, 2)).toBe(false)
    expect(await verifyLink('t'.repeat(32), 'edit', token, 2)).toBe(false)
    expect(await verifyLink('s'.repeat(32), 'edit', token.replace(ref, 'b'.repeat(32)), 2)).toBe(false)
    expect(await verifyLink('s'.repeat(32), 'edit', 'edit.nope')).toBe(false)
  })
})

describe('Stripe webhook signatures', () => {
  const secret = 'whsec_test'
  const now = 1_800_000_000_000
  const t = now / 1000
  it('accepts a genuine, recent signature and nothing else', async () => {
    const sig = await stripeSignature(secret, t, '{"id":"evt_1"}')
    expect(await verifyStripeSignature(secret, `t=${t},v1=${sig}`, '{"id":"evt_1"}', now)).toBe(true)
    // Stripe may send several v1 signatures while a secret is being rolled.
    expect(await verifyStripeSignature(secret, `t=${t},v1=${'0'.repeat(64)},v1=${sig}`, '{"id":"evt_1"}', now)).toBe(true)
    expect(await verifyStripeSignature(secret, `t=${t},v1=${sig}`, '{"id":"evt_2"}', now)).toBe(false)
    expect(await verifyStripeSignature(secret, `t=${t},v1=${sig}`, '{"id":"evt_1"}', now + 6 * 60 * 1000)).toBe(false)
    expect(await verifyStripeSignature(secret, `t=${t},v0=${sig}`, '{"id":"evt_1"}', now)).toBe(false)
    expect(await verifyStripeSignature(secret, null, '{"id":"evt_1"}', now)).toBe(false)
    expect(await verifyStripeSignature('whsec_other', `t=${t},v1=${sig}`, '{"id":"evt_1"}', now)).toBe(false)
  })
})

describe('the Stripe client', () => {
  it('sends Checkout in Stripe form encoding with the price it is given', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ id: 'cs_test_1', url: 'https://checkout.stripe.com/x' })))
    const p = stripePayments('sk_test_1', fetcher as unknown as typeof fetch)
    expect(await p.createCheckout({ ref: 'r', slug: 's', email: 'a@b.co', amount: 9900, currency: 'gbp', productName: 'Site', successUrl: 'https://a/?paid={CHECKOUT_SESSION_ID}', cancelUrl: 'https://a/', expiresAt: 1_800_000_000_000 }))
      .toEqual({ id: 'cs_test_1', url: 'https://checkout.stripe.com/x' })
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.stripe.com/v1/checkout/sessions')
    const body = new URLSearchParams(String(init.body))
    expect(body.get('line_items[0][price_data][unit_amount]')).toBe('9900')
    expect(body.get('mode')).toBe('payment')
    expect(body.get('metadata[ref]')).toBe('r')
    expect(body.get('success_url')).toBe('https://a/?paid={CHECKOUT_SESSION_ID}')
    expect(body.get('expires_at')).toBe('1800000000')
  })

  it('turns Stripe failures into a plain message, never Stripe’s own', async () => {
    const p = stripePayments('sk_test_1', (async () => new Response(JSON.stringify({ error: { message: 'No such payment_intent: secret detail' } }), { status: 400 })) as unknown as typeof fetch)
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await expect(p.refund('pi_1', 'k')).rejects.toMatchObject({ status: 502, message: expect.not.stringContaining('secret') })
    err.mockRestore()
  })
})

describe('email', () => {
  it('logs instead of sending when no Resend key is set', async () => {
    const lines: string[] = []
    await logMailer(l => lines.push(l)).send(email)
    expect(lines[0]).toContain('To: jo@example.com')
    expect(lines[0]).toContain('Subject: Hello')
    expect(lines[0]).toContain('Hi')
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    await mailerFor({ from: 'a@b.co', support: 'c@d.co', resendKey: null }).send(email)
    expect(log).toHaveBeenCalledWith(expect.stringContaining('no RESEND_API_KEY'))
    log.mockRestore()
  })

  it('sends through Resend with the key, and never throws when sending fails', async () => {
    const fetcher = vi.fn(async () => new Response('{}', { status: 200 }))
    await resendMailer('re_1', 'From <a@b.co>', 'help@b.co', fetcher as unknown as typeof fetch).send(email)
    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toMatchObject({ from: 'From <a@b.co>', to: ['jo@example.com'], reply_to: 'help@b.co', subject: 'Hello' })
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const failing = resendMailer('re_1', 'a@b.co', 'c@d.co', (async () => new Response('nope', { status: 500 })) as unknown as typeof fetch)
    expect(await sendQuietly(failing, email)).toBe(false)
    err.mockRestore()
  })

  it('writes the welcome email in HTML and text, escaping what it shows', () => {
    const c = parseConfig({ ...env, ...stripe, BRAND_NAME: 'Site <Blocks>' })
    const w = welcomeEmail(c, { to: 'jo@example.com', siteUrl: 'https://joes.siteblocks.co.uk/', editLink: 'https://siteblocks.co.uk/build/#edit=x', refundLink: 'https://siteblocks.co.uk/build/#refund=y', amount: 9900, paidAt: Date.UTC(2026, 9, 6), reference: 'ABCD1234', receiptUrl: null })
    expect(w.subject).toBe('Your site is live: joes.siteblocks.co.uk')
    expect(w.text).toContain('14-day money-back guarantee, no questions asked.')
    expect(w.text).toContain('by 20 October 2026')
    expect(w.text).toContain('£99 paid on 6 October 2026')
    expect(w.html).toContain('Site &#60;Blocks&#62;')
    expect(w.html).not.toContain('<Blocks>')
  })
})
