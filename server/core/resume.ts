import { z } from 'zod'
import { LIMITS } from '../../src/site/limits'
import { linkSecret } from './account'
import { builderUrl } from './config'
import type { Config } from './config'
import { authDraft } from './drafts'
import { resumeEmail, resumeReminderEmail } from './emails'
import { HttpError, json, readJson } from './http'
import { overLimit, rateLimit, SIZE } from './limits'
import type { Deps } from './ports'
import { DRAFT_KEY, newDraftKey, sha256Hex, signLink, verifyLink } from './tokens'

/**
 * "Email me a link to finish on my computer": an unpaid site started on a phone carries on on
 * another device. The link (resume.<ref>.<n>.<sent>.<signature>) works once, for 7 days, and only
 * while it's the site's newest; it hands that device a second draft key. The phone's key keeps
 * working. Optionally one reminder, three days later, from the daily cron. The email address
 * lives on the draft's row: it goes with the draft after 30 days unused, or when it's paid for.
 */

const DAY = 24 * 60 * 60 * 1000
/** Links each draft may send in 24 hours. */
export const RESUME_PER_DAY = 3
/** Links any one email address may be sent in a day, whichever sites they're for. */
export const RESUME_PER_RECIPIENT = { limit: 3, windowSec: 24 * 60 * 60 }
/** Links sent in a day in all: past this, none until tomorrow (a flood is cut off, not queued). */
export const RESUME_PER_DAY_ALL = { limit: 500, windowSec: 24 * 60 * 60 }
/** A link stops working this long after it was sent. */
export const RESUME_LINK_DAYS = 7
/** The reminder goes this long after the link, if they ticked "remind me". */
export const REMIND_AFTER_DAYS = 3
/** Reminders sent per cron run; the rest go tomorrow. */
const REMINDER_BATCH = 50

const resumeLink = async (c: Config, ref: string, n: number, now: number): Promise<string> =>
  `${builderUrl(c)}#resume=${await signLink(linkSecret(c), 'resume', ref, n, now)}`

const linkBody = z.object({ email: z.string().trim().email().max(LIMITS.email), remind: z.boolean() })

const TOO_MANY = 'We’ve sent this site’s link a few times today. Check your inbox and spam folder, or try again tomorrow.'

/** Per-address and overall daily caps on sending, so the form can't be used to flood an inbox. */
async function withinSendingCaps(deps: Deps, email: string): Promise<void> {
  if (await overLimit(deps, `resumeTo:${await sha256Hex(email.toLowerCase())}`, RESUME_PER_RECIPIENT) !== null) {
    throw new HttpError(429, 'too_many_links', TOO_MANY)
  }
  if (await overLimit(deps, 'resumeAll:day', RESUME_PER_DAY_ALL) !== null) {
    console.error('Resume links: the daily cap was reached')
    throw new HttpError(429, 'sending_paused', 'We can’t send links just now. Your site is kept in this browser: please try again tomorrow.')
  }
}

/**
 * POST /v1/draft/resume-link {email, remind} with the draft key: emails a link to carry on on
 * another device. The site must be saved to the server first (PUT /v1/draft) and unpaid. Each
 * new link stops the older ones working.
 */
export async function sendResumeLink(req: Request, deps: Deps): Promise<Response> {
  await rateLimit(deps, req, 'resumeLink')
  linkSecret(deps.config)
  const draft = await authDraft(req, deps)
  if (draft.payment || draft.refundedAt) throw new HttpError(409, 'already_paid', 'This site is live already: open the edit link from your email to change it.')
  const parsed = linkBody.safeParse(await readJson(req, SIZE.smallJson))
  if (!parsed.success) throw new HttpError(422, 'invalid_email', "That email doesn't look right. Check for a missing @ or dot.")
  if (!draft.record) throw new HttpError(409, 'not_saved', 'Your site isn’t saved yet. Please try again in a moment.')
  const { email, remind } = parsed.data
  await withinSendingCaps(deps, email)
  const now = deps.now()
  const n = await deps.db.recordResumeLink(draft.ref, { email, now, remindAt: remind ? now + REMIND_AFTER_DAYS * DAY : null, perDay: RESUME_PER_DAY })
  if (n === null) throw new HttpError(429, 'too_many_links', TOO_MANY)
  try {
    await deps.mailer.send(resumeEmail(deps.config, email, await resumeLink(deps.config, draft.ref, n, now), RESUME_LINK_DAYS))
  } catch (err) {
    console.error('Resume link email failed', err)
    throw new HttpError(502, 'email_failed', 'We couldn’t send the email just now. Please try again in a minute.')
  }
  return json({ ok: true, message: `We've sent a link to ${email}.` })
}

const openBody = z.object({ token: z.string().max(200), key: z.string().max(100).optional() })

const BAD_LINK = 'That link has expired or isn’t right. Ask for a new one from the site on your phone.'

/**
 * POST /v1/draft/resume {token, key?}: opens a resume link; the token is the authority. If the
 * `key` this browser already holds opens the same site, it's kept (answered back, the link left
 * unused). Otherwise the link is used up and this device gets a new key of its own, replacing an
 * earlier resume link's key.
 */
export async function openResumeLink(req: Request, deps: Deps): Promise<Response> {
  await rateLimit(deps, req, 'resumeOpen')
  const secret = linkSecret(deps.config)
  const parsed = openBody.safeParse(await readJson(req, SIZE.smallJson))
  const claim = parsed.success ? await verifyLink(secret, 'resume', parsed.data.token) : null
  const draft = claim ? await deps.db.draftByRef(claim.ref) : null
  if (!claim || !draft) throw new HttpError(401, 'unknown_link', BAD_LINK)
  if (draft.payment || draft.refundedAt) throw new HttpError(409, 'already_paid', 'This site is live already: open the edit link from your email.')
  const held = parsed.data?.key
  if (held && DRAFT_KEY.test(held) && (await deps.db.draftByKey(await sha256Hex(held)))?.ref === draft.ref) {
    await deps.db.touch(draft.ref, deps.now())
    return json({ key: held })
  }
  const now = deps.now()
  const issuedAt = claim.issuedAt ?? 0
  if (issuedAt > now + 5 * 60 * 1000 || now - issuedAt > RESUME_LINK_DAYS * DAY) throw new HttpError(401, 'unknown_link', BAD_LINK)
  const key = newDraftKey()
  // Only the newest link, once: a used, replaced or late one opens nothing.
  if (!(await deps.db.useResumeLink(draft.ref, claim.n, await sha256Hex(key)))) throw new HttpError(401, 'unknown_link', BAD_LINK)
  await deps.db.touch(draft.ref, now)
  return json({ key })
}

/** Daily cron: the one reminder for drafts whose owner ticked "remind me", three days on (a fresh link). */
export async function sendResumeReminders(deps: Deps): Promise<number> {
  if (!deps.config.linkSecret) return 0
  const now = deps.now()
  let sent = 0
  for (const { ref, email } of await deps.db.dueReminders(now, REMINDER_BATCH)) {
    // Claimed before sending: never twice, even if sending fails (no retries for a reminder).
    const n = await deps.db.claimReminder(ref, now)
    if (n === null) continue
    try {
      await deps.mailer.send(resumeReminderEmail(deps.config, email, await resumeLink(deps.config, ref, n, now), RESUME_LINK_DAYS))
      sent++
    } catch (err) {
      console.error(`Resume reminder for ${ref} failed`, err)
    }
  }
  return sent
}
