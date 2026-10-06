import { money } from './config'
import type { Config } from './config'
import type { Email } from './ports'

/** The emails we send: plain and short, each as HTML and as text. */

const esc = (s: string): string => s.replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`)

type Line = string | { link: string; label: string }

/** One simple layout: a heading, lines of text, links on their own lines, and the support address. */
function email(c: Config, to: string, subject: string, heading: string, lines: Line[]): Email {
  const support = c.email.support.replace(/^.*<([^>]+)>$/, '$1')
  const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>${esc(subject)}</title></head>`
    + `<body style="margin:0;padding:24px;font:16px/1.5 Arial,Helvetica,sans-serif;color:#16181D;background:#ffffff">`
    + `<div style="max-width:560px;margin:0 auto">`
    + `<h1 style="font-size:22px;line-height:1.25;margin:0 0 16px">${esc(heading)}</h1>`
    + lines.map(l => typeof l === 'string'
      ? `<p style="margin:0 0 14px">${esc(l)}</p>`
      : `<p style="margin:0 0 14px"><a href="${esc(l.link)}" style="color:#16181D;font-weight:bold">${esc(l.label)}</a></p>`).join('')
    + `<p style="margin:24px 0 0;font-size:14px;color:#4A4F5C">Questions? Reply to this email or write to <a href="mailto:${esc(support)}" style="color:#4A4F5C">${esc(support)}</a>.<br>${esc(c.brandName)}</p>`
    + `</div></body></html>`
  const text = [heading, '', ...lines.map(l => (typeof l === 'string' ? l : `${l.label}:\n${l.link}`)).flatMap(l => [l, '']),
    `Questions? Reply to this email or write to ${support}.`, c.brandName].join('\n')
  return { to, subject, html, text }
}

const day = (ms: number): string => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' })
const bare = (url: string): string => url.replace(/^https?:\/\//, '').replace(/\/$/, '')

export interface WelcomeEmail {
  to: string
  siteUrl: string
  editLink: string
  refundLink: string
  amount: number
  paidAt: number
  reference: string
  receiptUrl: string | null
}

export function welcomeEmail(c: Config, w: WelcomeEmail): Email {
  const refundBy = day(w.paidAt + c.refundDays * 24 * 60 * 60 * 1000)
  return email(c, w.to, `Your site is live: ${bare(w.siteUrl)}`, 'Your site is live', [
    { link: w.siteUrl, label: bare(w.siteUrl) },
    'To change anything, open your edit link. Saving your changes puts them live, free. Keep this link to yourself: anyone with it can edit your site.',
    { link: w.editLink, label: 'Edit your site' },
    `Receipt: ${money(w.amount)} paid on ${day(w.paidAt)}, one payment, no monthly fees. Reference ${w.reference}.`,
    ...(w.receiptUrl ? [{ link: w.receiptUrl, label: 'Your Stripe receipt' }] : []),
    `${c.refundDays}-day money-back guarantee, no questions asked. Not happy? Use this link by ${refundBy} and we'll refund ${money(w.amount)} and take your site down.`,
    { link: w.refundLink, label: 'Request a refund' },
  ])
}

export function refundEmail(c: Config, to: string, siteUrl: string, amount: number): Email {
  return email(c, to, `Refund on its way: ${money(amount)}`, 'Your refund is on its way', [
    `We've refunded ${money(amount)} to the card you paid with. It usually shows within 5 to 10 working days.`,
    `${bare(siteUrl)} has been taken down.`,
    'Thanks for trying us.',
  ])
}

export interface EditLinks { siteUrl: string; editLink: string; refund: { link: string; until: number } | null }

export function editLinksEmail(c: Config, to: string, sites: EditLinks[]): Email {
  return email(c, to, 'Your edit link', sites.length > 1 ? 'Your edit links' : 'Your edit link', [
    'Here is a fresh link to edit your site. Saving your changes puts them live, free. Keep it to yourself: anyone with it can edit your site. Older edit links no longer work.',
    ...sites.flatMap((s): Line[] => [
      { link: s.editLink, label: `Edit ${bare(s.siteUrl)}` },
      ...(s.refund ? [`Changed your mind? You can get a full refund until ${day(s.refund.until)}.`, { link: s.refund.link, label: `Request a refund for ${bare(s.siteUrl)}` }] : []),
    ]),
    "If you didn't ask for this, you can ignore it.",
  ])
}
