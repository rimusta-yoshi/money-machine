import type { Email, Mailer } from './ports'

/**
 * Email senders. Resend when a key is set; otherwise the email is written to the log, so
 * local runs and tests work with nothing to set up.
 */

/** Writes the email to the log instead of sending it. */
export function logMailer(log: (line: string) => void = line => console.log(line)): Mailer {
  return {
    async send(email) {
      log(`[email not sent: no RESEND_API_KEY] To: ${email.to}\nSubject: ${email.subject}\n\n${email.text}`)
    },
  }
}

/** Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email). */
export function resendMailer(apiKey: string, from: string, replyTo: string, fetcher: typeof fetch = (...a) => fetch(...a)): Mailer {
  return {
    async send(email: Email) {
      const res = await fetcher('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [email.to], reply_to: replyTo, subject: email.subject, html: email.html, text: email.text }),
      })
      if (!res.ok) throw new Error(`Resend refused the email (${res.status}): ${(await res.text()).slice(0, 300)}`)
    },
  }
}

export function mailerFor(c: { from: string; support: string; resendKey: string | null }): Mailer {
  return c.resendKey ? resendMailer(c.resendKey, c.from, c.support) : logMailer()
}

/** Sends, logging a failure instead of throwing: a lost email must never undo a payment or a refund. */
export async function sendQuietly(mailer: Mailer, email: Email): Promise<boolean> {
  try {
    await mailer.send(email)
    return true
  } catch (err) {
    console.error(`Email "${email.subject}" to ${email.to} failed`, err)
    return false
  }
}
