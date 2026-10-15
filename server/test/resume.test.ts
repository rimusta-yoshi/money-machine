import { createHash } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { finishedSite } from '../../src/publish/test/sites'
import { signLink } from '../core/tokens'
import { API, BASE, client } from './client'
import { fakeStripe, LINK_SECRET, PAYMENT_VARS } from './fakeStripe'
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
async function saved(email?: string) {
  const key = await c.newDraft()
  expect((await c.save(key, finishedSite(email ? { business: { email } } : {}))).status).toBe(200)
  return { key, ref: await refOf(key) }
}

const askLink = (key: string, email: string, remind = false) => c.call('/v1/draft/resume-link', { method: 'POST', key, json: { email, remind } })
const open = (token: string, key?: string) => c.call('/v1/draft/resume', { method: 'POST', json: key ? { token, key } : { token } })
const tokenIn = (text: string) => /#resume=([\w.-]+)/.exec(text)![1]
const keyFrom = async (res: Response) => {
  expect(res.status).toBe(200)
  return ((await res.json()) as { key: string }).key
}
const pay = async (key: string, slug: string) => {
  expect((await c.checkout(key, slug)).status).toBe(201)
  expect((await s.fetch(...await stripe.webhook(API, stripe.completed(stripe.lastSession().id)))).status).toBe(200)
}

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
    expect(sent[0].text).toContain(`https://app.localblocks.test/build/#resume=resume.${ref}.1.`)
    expect(tokenIn(sent[0].text)).toMatch(/^resume\.[0-9a-f]{32}\.1\.\d{10}\.[\w-]{43}$/)
    expect(sent[0].text).toContain('The link works once, for 7 days, and stops working if you ask for a newer one.')
    expect(sent[0].text).toContain('anyone with it can edit your unfinished site')
    expect(sent[0].text).toContain("If you didn't ask for this, you can ignore it.")
    expect(sent[0].text).not.toContain("Joe's Plumbing")
    expect(sent[0].html).not.toContain('Joe')
    expect(await row('SELECT resume_email, resume_remind_at, resume_sent_count, resume_n FROM drafts WHERE ref = ?1', ref))
      .toEqual({ resume_email: email, resume_remind_at: null, resume_sent_count: 1, resume_n: 1 })
  })

  it('sends at most 3 a day per site', async () => {
    const { key, ref } = await saved()
    const emails = [freshEmail(), freshEmail(), freshEmail(), freshEmail()]
    for (const email of emails.slice(0, 3)) expect((await askLink(key, email)).status).toBe(200)
    const fourth = await askLink(key, emails[3])
    expect(fourth.status).toBe(429)
    expect(await fourth.json()).toMatchObject({ error: 'too_many_links' })
    expect(stripe.emailsTo(emails[3])).toHaveLength(0)
    // A day later it can send again.
    await sql('UPDATE drafts SET resume_sent_at = resume_sent_at - ?2 WHERE ref = ?1', ref, DAY + 1000)
    expect((await askLink(key, emails[3])).status).toBe(200)
    expect(stripe.emailsTo(emails[3])).toHaveLength(1)
  })

  it('sends at most 3 a day to one address, whichever sites they are for, in any case', async () => {
    const email = freshEmail()
    for (const to of [email, email.toUpperCase(), ` ${email}`]) expect((await askLink((await saved()).key, to)).status).toBe(200)
    const fourth = await askLink((await saved()).key, `P${email.slice(1)}`)
    expect(fourth.status).toBe(429)
    expect(await fourth.json()).toMatchObject({ error: 'too_many_links' })
    expect(stripe.emails.filter(e => e.to.some(t => t.toLowerCase() === email))).toHaveLength(3)
  })

  it('stops sending for the day once the overall cap is reached', async () => {
    const nowSec = Math.floor(Date.now() / 1000)
    const day = nowSec - (nowSec % 86400)
    await sql("INSERT INTO rate_limits (key, window_start, count) VALUES ('resumeAll:day', ?1, 500) ON CONFLICT (key) DO UPDATE SET window_start = ?1, count = 500", day)
    try {
      const email = freshEmail()
      const res = await askLink((await saved()).key, email)
      expect(res.status).toBe(429)
      expect(await res.json()).toMatchObject({ error: 'sending_paused', message: expect.stringContaining('try again tomorrow') })
      expect(stripe.emailsTo(email)).toHaveLength(0)
    } finally {
      await sql("DELETE FROM rate_limits WHERE key = 'resumeAll:day'")
    }
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
    const email = freshEmail()
    const { key, ref } = await saved(email)
    expect((await askLink(key, email)).status).toBe(200)
    const token = tokenIn(stripe.emailsTo(email)[0].text)
    await pay(key, `resume-paid-${n}`)

    const again = await askLink(key, email)
    expect(again.status).toBe(409)
    expect(await again.json()).toMatchObject({ error: 'already_paid' })
    const opened = await open(token)
    expect(opened.status).toBe(409)
    expect(await opened.json()).toEqual({ error: 'already_paid', message: 'This site is live already: open the edit link from your email.' })
    // The address was only for finishing the site: gone once it's paid for.
    expect(await row('SELECT resume_email, resume_remind_at FROM drafts WHERE ref = ?1', ref)).toEqual({ resume_email: null, resume_remind_at: null })
  })

  it('forgets the address when the site is published with the admin key', async () => {
    const email = freshEmail()
    const { key, ref } = await saved()
    await askLink(key, email, true)
    expect((await c.publish(key, `resume-admin-${n}`, ADMIN)).status).toBe(200)
    expect(await row('SELECT resume_email, resume_remind_at FROM drafts WHERE ref = ?1', ref)).toEqual({ resume_email: null, resume_remind_at: null })
  })
})

describe('opening a resume link', () => {
  it('gives this device its own key once; the phone’s key keeps working', async () => {
    const { key, ref } = await saved()
    const email = freshEmail()
    await askLink(key, email)
    const token = tokenIn(stripe.emailsTo(email)[0].text)
    const computer = await keyFrom(await open(token))
    expect(computer).toMatch(/^[\w-]{43}$/)
    expect(computer).not.toBe(key)

    const loaded = await c.call('/v1/draft', { key: computer })
    expect(loaded.status).toBe(200)
    expect(await loaded.json()).toMatchObject({ record: { business: { name: "Joe's Plumbing" } }, paid: false })
    expect((await c.save(computer, finishedSite({ business: { name: 'From The Computer' } }))).status).toBe(200)
    expect(await (await c.call('/v1/draft', { key })).json()).toMatchObject({ record: { business: { name: 'From The Computer' } } })
    expect(await refOf(key)).toBe(ref)

    // A link works once.
    const again = await open(token)
    expect(again.status).toBe(401)
    expect(await again.json()).toMatchObject({ error: 'unknown_link' })

    // A newer link opened on a third device: this one is told why it stopped; the phone carries on.
    await askLink(key, email)
    const third = await keyFrom(await open(tokenIn(stripe.emailsTo(email)[1].text)))
    expect((await c.call('/v1/draft', { key: third })).status).toBe(200)
    const replaced = await c.call('/v1/draft', { key: computer })
    expect(replaced.status).toBe(401)
    expect(await replaced.json()).toEqual({ error: 'key_replaced', message: 'This site was opened on another device. Open the newest link from your email to carry on here.' })
    expect((await c.call('/v1/draft', { key })).status).toBe(200)
    // A key nobody ever had is just not found.
    expect(await (await c.call('/v1/draft', { key: 'z'.repeat(43) })).json()).toMatchObject({ error: 'unknown_draft' })
  })

  it('keeps the key this browser holds when it already opens the site, leaving the link unused', async () => {
    const { key } = await saved()
    const email = freshEmail()
    await askLink(key, email)
    const token = tokenIn(stripe.emailsTo(email)[0].text)
    expect(await keyFrom(await open(token, key))).toBe(key)
    // Another site's key is no reason to keep it: a new key, and the link is used up.
    const other = await saved()
    const fresh = await keyFrom(await open(token, other.key))
    expect(fresh).not.toBe(other.key)
    expect((await c.call('/v1/draft', { key: fresh })).status).toBe(200)
    expect(await refOf(other.key)).toBe(other.ref)
    expect((await open(token)).status).toBe(401)
  })

  it('stops a link working once a newer one is sent, and 7 days after it was sent', async () => {
    const { key, ref } = await saved()
    const email = freshEmail()
    await askLink(key, email)
    await askLink(key, email)
    const [older, newer] = stripe.emailsTo(email).map(e => tokenIn(e.text))
    expect((await open(older)).status).toBe(401)

    const latest = (await row<{ resume_n: number }>('SELECT resume_n FROM drafts WHERE ref = ?1', ref))!.resume_n
    expect((await open(await signLink(LINK_SECRET, 'resume', ref, latest, Date.now() - 7 * DAY - 60_000))).status).toBe(401)
    expect((await open(await signLink(LINK_SECRET, 'resume', ref, latest, Date.now() + DAY))).status).toBe(401)
    expect((await open(await signLink(LINK_SECRET, 'resume', ref, latest, Date.now() - 7 * DAY + 60_000))).status).toBe(200)
    // That used it up: the emailed one with the same number opens nothing now.
    expect((await open(newer)).status).toBe(401)
  })

  it('refuses a tampered or made-up token, and is not a draft key itself', async () => {
    const { key, ref } = await saved()
    const email = freshEmail()
    await askLink(key, email)
    const token = tokenIn(stripe.emailsTo(email)[0].text)
    const other = await saved()
    const bad = [
      token.replace(ref, other.ref), `${token.slice(0, -2)}xx`, `resume.${ref}.${'a'.repeat(43)}`, 'nonsense',
      token.replace(/^resume/, 'refund'), token.replace(`${ref}.1.`, `${ref}.2.`),
    ]
    for (const t of bad) {
      const res = await open(t)
      expect(res.status, t).toBe(401)
      expect(await res.json()).toMatchObject({ error: 'unknown_link', message: expect.stringContaining('That link has expired or isn’t right') })
    }
    expect((await c.call('/v1/draft', { key: token })).status).toBe(401)
    expect((await open(token)).status).toBe(200)
  })
})

describe('after paying', () => {
  it('a resume link’s key stops working once the site is paid for with the other one', async () => {
    const email = freshEmail()
    const { key } = await saved(email)
    await askLink(key, email)
    const computer = await keyFrom(await open(tokenIn(stripe.emailsTo(email)[0].text)))
    await pay(key, `resume-alt-${n}`)

    const put = await c.save(computer, finishedSite({ business: { email, name: 'Sneaky Edit' } }))
    expect(put.status).toBe(401)
    expect(await put.json()).toEqual({ error: 'key_replaced', message: 'This site is live now: open the edit link from your email to change it.' })
    expect((await c.call('/v1/draft/publish', { method: 'POST', key: computer, json: {} })).status).toBe(401)
    expect((await c.call('/v1/draft', { key: computer })).status).toBe(401)
    expect((await c.call('/v1/draft/publish', { method: 'POST', key, json: {} })).status).toBe(200)
    expect(await (await c.call('/v1/draft', { key })).json()).toMatchObject({ paid: true, record: { business: { name: "Joe's Plumbing" } } })
  })

  it('the device that checks out keeps editing; the other stops', async () => {
    const email = freshEmail()
    const { key: phone } = await saved(email)
    await askLink(phone, email)
    const computer = await keyFrom(await open(tokenIn(stripe.emailsTo(email)[0].text)))
    await pay(computer, `resume-promote-${n}`)
    expect(await (await c.call('/v1/draft', { key: computer })).json()).toMatchObject({ paid: true })
    expect((await c.call('/v1/draft/publish', { method: 'POST', key: computer, json: {} })).status).toBe(200)
    const old = await c.call('/v1/draft', { key: phone })
    expect(old.status).toBe(401)
    expect(await old.json()).toMatchObject({ error: 'key_replaced' })
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
    expect(reminders[0].text).toContain(`#resume=resume.${ticked.ref}.2.`)
    expect(reminders[0].text).not.toContain('Joe')
    // A fresh link: the first one stops working.
    expect((await open(tokenIn(stripe.emailsTo(yes)[0].text))).status).toBe(401)
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
