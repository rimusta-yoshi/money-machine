import { PAGES } from '../../src/brand/config'
import { money } from './config'
import type { Config } from './config'
import type { Email } from './ports'

/** The emails we send: plain and short, each as HTML and as text. */

const esc = (s: string): string => s.replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`)

type Line = string | { link: string; label: string }

/** One simple layout: a heading, lines of text, links on their own lines, and the support address. */
function email(c: Config, to: string, subject: string, heading: string, lines: Line[]): Email {
  const support = c.email.support.replace(/^.*<([^>]+)>$/, '$1')
  const privacy = `${c.appUrl}${PAGES.privacy}`
  const terms = `${c.appUrl}${PAGES.terms}`
  const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>${esc(subject)}</title></head>`
    + `<body style="margin:0;padding:24px;font:16px/1.5 Arial,Helvetica,sans-serif;color:#16181D;background:#ffffff">`
    + `<div style="max-width:560px;margin:0 auto">`
    + `<h1 style="font-size:22px;line-height:1.25;margin:0 0 16px">${esc(heading)}</h1>`
    + lines.map(l => typeof l === 'string'
      ? `<p style="margin:0 0 14px">${esc(l)}</p>`
      : `<p style="margin:0 0 14px"><a href="${esc(l.link)}" style="color:#16181D;font-weight:bold">${esc(l.label)}</a></p>`).join('')
    + `<p style="margin:24px 0 0;font-size:14px;color:#4A4F5C">Questions? Reply to this email or write to <a href="mailto:${esc(support)}" style="color:#4A4F5C">${esc(support)}</a>.<br>${esc(c.brandName)}</p>`
    + `<p style="margin:8px 0 0;font-size:14px;color:#4A4F5C"><a href="${esc(privacy)}" style="color:#4A4F5C">Privacy</a> · <a href="${esc(terms)}" style="color:#4A4F5C">Terms</a></p>`
    + `</div></body></html>`
  const text = [heading, '', ...lines.map(l => (typeof l === 'string' ? l : `${l.label}:\n${l.link}`)).flatMap(l => [l, '']),
    `Questions? Reply to this email or write to ${support}.`, c.brandName, '', `Privacy: ${privacy}`, `Terms: ${terms}`].join('\n')
  return { to, subject, html, text }
}

/**
 * "Download your site" from an edit link: the same key, opening the download page instead of
 * the builder. Without a key (e.g. from a closed site's page) it asks for a new edit link.
 */
export const downloadLinkFor = (editLink: string): string => editLink.replace('#edit=', '#download=')
/** "Use your own domain" from an edit link, the same way. */
export const domainLinkFor = (editLink: string): string => editLink.replace('#edit=', '#domain=')
const DOMAIN_LINE = 'Got a domain of your own, like yourname.co.uk? Connect it at no extra cost.'
const DOWNLOAD_LINE ='Your site is yours: download the whole thing to keep a copy or to host it anywhere else. Like the edit link, it stops working once you open a newer one.'

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
    DOWNLOAD_LINE,
    { link: downloadLinkFor(w.editLink), label: 'Download your site' },
    DOMAIN_LINE,
    { link: domainLinkFor(w.editLink), label: 'Use your own domain' },
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

const supportAddress = (c: Config): string => c.email.support.replace(/^.*<([^>]+)>$/, '$1')

export function disputeOpenedEmail(c: Config, to: string, siteUrl: string): Email {
  return email(c, to, `Your site is paused: ${bare(siteUrl)}`, 'Your site is paused', [
    `Your payment is being disputed with your bank, so your site is paused. If this is a mistake, contact us at ${supportAddress(c)}.`,
    `${bare(siteUrl)} shows "This site is no longer available" until the dispute is settled.`,
  ])
}

export function disputeWonEmail(c: Config, to: string, siteUrl: string): Email {
  return email(c, to, `Your site is back: ${bare(siteUrl)}`, 'Your site is back', [
    'The dispute about your payment has been settled, so your site is live again, just as it was.',
    { link: siteUrl, label: bare(siteUrl) },
  ])
}

export interface DomainLive {
  /** https://www.example.co.uk/ */
  url: string
  /** The free address, which now sends visitors there. */
  freeUrl: string
  /** example.co.uk, when it isn't connected itself and needs forwarding at the domain company. */
  bareToForward: string | null
}

/** Sent once, when the customer's own domain first goes live. */
export function domainLiveEmail(c: Config, to: string, d: DomainLive): Email {
  return email(c, to, `Your domain is live: ${bare(d.url)}`, 'Your domain is live', [
    'Your site now opens at your own domain, with a secure (https) connection.',
    { link: d.url, label: bare(d.url) },
    `Your free address, ${bare(d.freeUrl)}, sends visitors there too, so old links keep working.`,
    ...(d.bareToForward
      ? [`One last thing, if you haven't already: so ${d.bareToForward} (without the www) works too, switch on forwarding at your domain company and send it to ${d.url.replace(/\/$/, '')}. It's free, and their help pages call it "domain forwarding".`]
      : []),
    'Your domain stays yours: keep renewing it with your domain company.',
  ])
}

export interface EditLinks { siteUrl: string; editLink: string; refund: { link: string; until: number } | null }

export function editLinksEmail(c: Config, to: string, sites: EditLinks[]): Email {
  return email(c, to, 'Your edit link', sites.length > 1 ? 'Your edit links' : 'Your edit link', [
    'Here is a fresh link to edit your site. Saving your changes puts them live, free. Keep it to yourself: anyone with it can edit your site. Once you open it, older edit links stop working.',
    ...sites.flatMap((s): Line[] => [
      { link: s.editLink, label: `Edit ${bare(s.siteUrl)}` },
      { link: downloadLinkFor(s.editLink), label: `Download ${bare(s.siteUrl)}` },
      ...(s.refund ? [`Changed your mind? You can get a full refund until ${day(s.refund.until)}.`, { link: s.refund.link, label: `Request a refund for ${bare(s.siteUrl)}` }] : []),
    ]),
    "If you didn't ask for this, you can ignore it.",
  ])
}

/*
 * "Finish on your computer". Nothing the customer typed goes in these (not even the business
 * name), so the form can't be used to send anyone words of someone else's choosing.
 */
const resumeLines = (days: number): Line[] => [
  `The link works once, for ${days} days, and stops working if you ask for a newer one. Keep it to yourself: anyone with it can edit your unfinished site.`,
  "If you didn't ask for this, you can ignore it.",
]

/** The link to carry on with an unpaid site on another device. */
export function resumeEmail(c: Config, to: string, link: string, days: number): Email {
  return email(c, to, 'Finish your website on your computer', 'Finish your website on your computer', [
    'Here is your link to carry on building your website on your computer, just where you left off.',
    { link, label: 'Carry on building your website' },
    ...resumeLines(days),
  ])
}

/** The one reminder, a few days later, when they ticked "remind me". */
export function resumeReminderEmail(c: Config, to: string, link: string, days: number): Email {
  return email(c, to, 'Your website is waiting', 'Your website is waiting', [
    'You asked us to remind you: your website is saved just as you left it, ready to finish.',
    { link, label: 'Carry on building your website' },
    'This is the only reminder we will send.',
    ...resumeLines(days),
  ])
}
