import { z } from 'zod'
import { LIMITS } from '../../src/site/limits'
import { linkSecret } from './account'
import { KEEP_UNPAID_DAYS } from './cleanup'
import { builderUrl } from './config'
import type { Config } from './config'
import { authDraft } from './drafts'
import { resumeEmail, resumeReminderEmail } from './emails'
import { HttpError, json, readJson } from './http'
import { rateLimit, SIZE } from './limits'
import type { Deps } from './ports'
import { newDraftKey, sha256Hex, signLink, verifyLink } from './tokens'

/**
 * "Email me a link to finish on my computer": an unpaid site started on a phone carries on on
 * another device. The link (resume.<ref>.<signature>) hands that device a second draft key; the
 * phone's key keeps working. Optionally one reminder, three days later, from the daily cron.
 * The email address lives on the draft's row, so it goes with the draft after 30 days unused.
 */

const DAY = 24 * 60 * 60 * 1000
/** Links each draft may send in 24 hours. */
export const RESUME_PER_DAY = 3
/** The reminder goes this long after the link, if they ticked "remind me". */
export const REMIND_AFTER_DAYS = 3
/** Reminders sent per cron run; the rest go tomorrow. */
const REMINDER_BATCH = 50

export const resumeLink = async (c: Config, ref: string): Promise<string> =>
  `${builderUrl(c)}#resume=${await signLink(linkSecret(c), 'resume', ref)}`

const linkBody = z.object({ email: z.string().trim().email().max(LIMITS.email), remind: z.boolean() })

/**
 * POST /v1/draft/resume-link {email, remind} with the draft key: emails a link to carry on on
 * another device. The site must be saved to the server first (PUT /v1/draft) and unpaid.
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
  const now = deps.now()
  const recorded = await deps.db.recordResumeLink(draft.ref, { email, now, remindAt: remind ? now + REMIND_AFTER_DAYS * DAY : null, perDay: RESUME_PER_DAY })
  if (!recorded) throw new HttpError(429, 'too_many_links', 'We’ve sent this site’s link a few times today. Check your inbox and spam folder, or try again tomorrow.')
  const link = await resumeLink(deps.config, draft.ref)
  try {
    await deps.mailer.send(resumeEmail(deps.config, email, link, KEEP_UNPAID_DAYS))
  } catch (err) {
    console.error('Resume link email failed', err)
    throw new HttpError(502, 'email_failed', 'We couldn’t send the email just now. Please try again in a minute.')
  }
  return json({ ok: true, message: `We've sent a link to ${email}.` })
}

const openBody = z.object({ token: z.string().max(200) })

/**
 * POST /v1/draft/resume {token}: opens a resume link. The token is the authority: it answers a
 * new draft key for this device (replacing any earlier resume link's key).
 */
export async function openResumeLink(req: Request, deps: Deps): Promise<Response> {
  await rateLimit(deps, req, 'resumeOpen')
  const secret = linkSecret(deps.config)
  const parsed = openBody.safeParse(await readJson(req, SIZE.smallJson))
  const claim = parsed.success ? await verifyLink(secret, 'resume', parsed.data.token) : null
  const draft = claim ? await deps.db.draftByRef(claim.ref) : null
  if (!draft) throw new HttpError(401, 'unknown_link', 'That link has expired or isn’t right. Unfinished sites are kept for 30 days after you last worked on them.')
  if (draft.payment || draft.refundedAt) throw new HttpError(409, 'already_paid', 'This site is live already: open the edit link from your email.')
  const key = newDraftKey()
  await deps.db.setAltKey(draft.ref, await sha256Hex(key))
  await deps.db.touch(draft.ref, deps.now())
  return json({ key })
}

/** Daily cron: the one reminder for drafts whose owner ticked "remind me", three days on. */
export async function sendResumeReminders(deps: Deps): Promise<number> {
  if (!deps.config.linkSecret) return 0
  const now = deps.now()
  let sent = 0
  for (const { ref, email } of await deps.db.dueReminders(now, REMINDER_BATCH)) {
    // Claimed before sending: never twice, even if sending fails (no retries for a reminder).
    if (!(await deps.db.claimReminder(ref, now))) continue
    try {
      await deps.mailer.send(resumeReminderEmail(deps.config, email, await resumeLink(deps.config, ref), KEEP_UNPAID_DAYS))
      sent++
    } catch (err) {
      console.error(`Resume reminder for ${ref} failed`, err)
    }
  }
  return sent
}
