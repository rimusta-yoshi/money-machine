import type { SiteSummary, TakedownResult } from './types'

/** Words for take-down and restore on the dashboard (panels/FindSitePanel, panels/TakedownForm). */

export type TakedownAction = 'takedown' | 'restore'

export const siteLabel = (s: { name: string | null; ref: string }): string => s.name || `Site ${s.ref.slice(0, 8).toUpperCase()}`

/** One line on where the site stands, take-down first (it hides everything else). */
export function standing(s: SiteSummary): string {
  if (s.takenDown) return 'Taken down'
  if (s.refunded) return 'Refunded (down)'
  if (s.disputeLost) return 'Dispute lost (down)'
  if (s.disputed) return 'Payment disputed (down)'
  if (s.paid) return 'Paid and live'
  return s.published ? 'Published (admin)' : 'Not published'
}

/** The free address while the site is live (nothing keeps it down). */
export const liveUrl = (s: SiteSummary): string | null =>
  s.published && !s.takenDown && !s.refunded && !s.disputed && !s.disputeLost ? s.url : null

/** What to announce once the server has answered. */
export function doneMessage(action: TakedownAction, label: string, r: TakedownResult): string {
  if (action === 'takedown') {
    const lag = r.domainPaused === false && r.site.ownDomain ? ` Its own domain (${r.site.ownDomain.hostname}) will be paused by the next background check, within 15 minutes.` : ''
    return `${label} is taken down. No email was sent: reply to the owner by hand.${lag}`
  }
  if (r.stillDown) return `${label}’s take-down is lifted, but the site stays down: it was refunded or has a payment dispute.`
  const domain = r.site.ownDomain ? ' Its own domain comes back once Cloudflare has checked it again (usually a few minutes).' : ''
  return `${label} is back online.${domain}`
}
