import { createHash } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { finishedSite } from '../../src/publish/test/sites'
import { API, BASE, client } from './client'
import { fakeStripe, PAYMENT_VARS } from './fakeStripe'
import { startStack } from './stack'
import type { Stack } from './stack'

/** "Email me a link to finish on my computer" under Miniflare, with Resend faked. */

const ADMIN = 'resume-admin-key-0123456789abcdef'
const DAY = 24 * 60 * 60 * 1000

let s: Stack
let c: ReturnType<typeof client>
const stripe = fakeStripe()
beforeAll(async () => {
  s = await startStack({ baseDomain: BASE, adminToken: ADMIN, vars: PAYMENT_VARS, outbound: stripe.handle })
  c = client(s)
}, 60_000)
afterAll(() => s?.close(), 60_000)

const sql = async (query: string, ...values: unknown[]) => (await s.db()).prepare(query).bind(...values).run()
const row = async <T>(query: string, ...values: unknown[]) => (await s.db()).prepare(query).bind(...values).first<T>()
const refOf = async (key: string) => (await row<{ ref: string }>('SELECT ref FROM drafts WHERE key_hash = ?1', createHash('sha256').update(key).digest('hex')))!.ref
const cron = async () => (await s.mf.getWorker('api')).scheduled({ cron: '17 3 * * *' })

let n = 0
const freshEmail = () => `phone${++n}.${Date.now().toString(36)}@example.com`

/** A draft saved to the server, as the builder sends it before asking for the link. */
async function saved() {
  const key = await c.newDraft()
  expect((await c.save(key, finishedSite())).status).toBe(200)
  return { key, ref: await refOf(key) }
}

const askLink = (key: string, email: string, remind = false) => c.call('/v1/draft/resume-link', { method: 'POST', key, json: { email, remind } })
const open = (token: string) => c.call('/v1/draft/resume', { method: 'POST', json: { token } })
const tokenIn = (text: string) => /#resume=([\w.-]+)/.exec(text)![1]

describe('emailing a resume link', () => {
  it('sends the link, with nothing the customer typed in it', async () => {
    const { key, ref } = await saved()
    const email = freshEmail()
    const res = await askLink(key, `  ${email} `)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, message: `We've sent a link to ${email}.` })
    const sent = stripe.emailsTo(email)
    expect(sent).toHaveLength(1)
    expect(sent[0].subject).toBe('Finish your website on your computer')
    expect(sent[0].text).toContain(`https://app.localblocks.test/build/#resume=resume.${ref}.`)
    expect(sent[0].text).toContain('works for 30 days after you last worked on your site')
    expect(sent[0].text).toContain('anyone with it can edit your unfinished site')
    expect(sent[0].text).toContain("If you didn't ask for this, you can ignore it.")
    expect(sent[0].text).not.toContain("Joe's Plumbing")
    expect(sent[0].html).not.toContain('Joe')
    expect(await row('SELECT resume_email, resume_remind_at, resume_sent_count FROM drafts WHERE ref = ?1', ref))
      .toEqual({ resume_email: email, resume_remind_at: null, resume_sent_count: 1 })
  })

  it('sends at most 3 a day per site', async () => {
    const { key, ref } = await saved()
    const email = freshEmail()
    for (let i = 0; i < 3; i++) expect((await askLink(key, email)).status).toBe(200)
    const fourth = await askLink(key, email)
    expect(fourth.status).toBe(429)
    expect(await fourth.json()).toMatchObject({ error: 'too_many_links' })
    expect(stripe.emailsTo(email)).toHaveLength(3)
    // A day later it can send again.
    await sql('UPDATE drafts SET resume_sent_at = resume_sent_at - ?2 WHERE ref = ?1', ref, DAY + 1000)
    expect((await askLink(key, email)).status).toBe(200)
    expect(stripe.emailsTo(email)).toHaveLength(4)
  })

  it('refuses a bad email, a missing key, and a site not saved yet', async () => {
    const { key } = await saved()
    for (const email of ['not-an-email', '', `${'a'.repeat(250)}@example.com`]) {
      const res = await askLink(key, email)
      expect(res.status, email).toBe(422)
      expect(await res.json()).toMatchObject({ error: 'invalid_email' })
    }
    expect((await c.call('/v1/draft/resume-link', { method: 'POST', key, json: { email: freshEmail() } })).status).toBe(422)
    expect((await c.call('/v1/draft/resume-link', { method: 'POST', json: { email: freshEmail(), remind: false } })).status).toBe(401)
    const empty = await c.newDraft()
    const res = await askLink(empty, freshEmail())
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ error: 'not_saved' })
  })

  it('refuses a paid site, and a paid site’s resume link', async () => {
    const key = await c.newDraft()
    const email = freshEmail()
    await c.save(key, finishedSite({ business: { email } }))
    expect((await askLink(key, email)).status).toBe(200)
    const token = tokenIn(stripe.emailsTo(email)[0].text)
    expect((await c.checkout(key, `resume-paid-${n}`)).status).toBe(201)
    expect((await s.fetch(...await stripe.webhook(API, stripe.completed(stripe.lastSession().id)))).status).toBe(200)

    const again = await askLink(key, email)
    expect(again.status).toBe(409)
    expect(await again.json()).toMatchObject({ error: 'already_paid' })
    const opened = await open(token)
    expect(opened.status).toBe(409)
    // The address was only for finishing the site: gone once it's paid for.
    expect(await row('SELECT resume_email, resume_remind_at FROM drafts WHERE ref = ?1', await refOf(key))).toEqual({ resume_email: null, resume_remind_at: null })
    expect(await opened.json()).toEqual({ error: 'already_paid', message: 'This site is live already: open the edit link from your email.' })
  })
})

describe('opening a resume link', () => {
  it('gives this device its own key; the phone’s key keeps working', async () => {
    const { key, ref } = await saved()
    const email = freshEmail()
    await askLink(key, email)
    const token = tokenIn(stripe.emailsTo(email)[0].text)
    const res = await open(token)
    expect(res.status).toBe(200)
    const { key: computer } = (await res.json()) as { key: string }
    expect(computer).toMatch(/^[\w-]{43}$/)
    expect(computer).not.toBe(key)

    const loaded = await c.call('/v1/draft', { key: computer })
    expect(loaded.status).toBe(200)
    expect(await loaded.json()).toMatchObject({ record: { business: { name: "Joe's Plumbing" } }, paid: false })
    expect((await c.save(computer, finishedSite({ business: { name: 'From The Computer' } }))).status).toBe(200)
    expect(await (await c.call('/v1/draft', { key })).json()).toMatchObject({ record: { business: { name: 'From The Computer' } } })
    expect(await refOf(key)).toBe(ref)

    // Opening it again hands out a new key, and the last one stops working.
    const { key: second } = (await (await open(token)).json()) as { key: string }
    expect((await c.call('/v1/draft', { key: second })).status).toBe(200)
    expect((await c.call('/v1/draft', { key: computer })).status).toBe(401)
    expect((await c.call('/v1/draft', { key })).status).toBe(200)
  })

  it('refuses a tampered or made-up token, and is not a draft key itself', async () => {
    const { key, ref } = await saved()
    const email = freshEmail()
    await askLink(key, email)
    const token = tokenIn(stripe.emailsTo(email)[0].text)
    const other = await saved()
    for (const bad of [token.replace(ref, other.ref), `${token.slice(0, -2)}xx`, `resume.${ref}.${'a'.repeat(43)}`, 'nonsense', token.replace(/^resume/, 'refund')]) {
      const res = await open(bad)
      expect(res.status, bad).toBe(401)
      expect(await res.json()).toMatchObject({ error: 'unknown_link', message: expect.stringContaining('That link has expired or isn’t right') })
    }
    expect((await c.call('/v1/draft', { key: token })).status).toBe(401)
  })
})

describe('the reminder', () => {
  it('is sent once by the daily cron, only if ticked, and only after 3 days', async () => {
    const ticked = await saved()
    const unticked = await saved()
    const yes = freshEmail()
    const no = freshEmail()
    expect((await askLink(ticked.key, yes, true)).status).toBe(200)
    expect((await askLink(unticked.key, no, false)).status).toBe(200)
    const due = await row<{ resume_remind_at: number }>('SELECT resume_remind_at FROM drafts WHERE ref = ?1', ticked.ref)
    expect(due!.resume_remind_at - Date.now()).toBeGreaterThan(3 * DAY - 60_000)

    await cron()
    expect(stripe.emailsTo(yes).map(e => e.subject)).toEqual(['Finish your website on your computer'])

    await sql('UPDATE drafts SET resume_remind_at = resume_remind_at - ?2 WHERE ref IN (?1, ?3)', ticked.ref, 3 * DAY + 1000, unticked.ref)
    await cron()
    const reminders = stripe.emailsTo(yes).filter(e => e.subject === 'Your website is waiting')
    expect(reminders).toHaveLength(1)
    expect(reminders[0].text).toContain(`#resume=resume.${ticked.ref}.`)
    expect(reminders[0].text).not.toContain('Joe')
    expect((await open(tokenIn(reminders[0].text))).status).toBe(200)
    expect(stripe.emailsTo(no).filter(e => e.subject === 'Your website is waiting')).toHaveLength(0)

    // Never a second one, even if they ask for the link (and tick it) again.
    expect((await askLink(ticked.key, yes, true)).status).toBe(200)
    await sql('UPDATE drafts SET resume_remind_at = 1 WHERE ref = ?1', ticked.ref)
    await cron()
    expect(stripe.emailsTo(yes).filter(e => e.subject === 'Your website is waiting')).toHaveLength(1)
  })

  it('goes with the draft when cleanup deletes it after 30 days unused', async () => {
    const { key, ref } = await saved()
    const email = freshEmail()
    await askLink(key, email, true)
    const token = tokenIn(stripe.emailsTo(email)[0].text)
    await sql('UPDATE drafts SET updated_at = 1, seen_at = 1, resume_remind_at = 1 WHERE ref = ?1', ref)
    await cron()
    expect(await row('SELECT ref FROM drafts WHERE ref = ?1', ref)).toBeNull()
    expect(await row('SELECT ref FROM drafts WHERE resume_email = ?1', email)).toBeNull()
    expect((await c.call('/v1/draft', { key })).status).toBe(401)
    expect((await open(token)).status).toBe(401)
    expect(stripe.emailsTo(email).filter(e => e.subject === 'Your website is waiting')).toHaveLength(0)
  })
})
