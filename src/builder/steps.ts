import { TRADE_IDS } from '../types'
import type { BusinessInfo, TradeId } from '../types'

/** The builder's four steps, in order. */
export type Step = 'basics' | 'look' | 'build' | 'finish'

export const STEPS: readonly { id: Step; label: string }[] = [
  { id: 'basics', label: 'Basics' },
  { id: 'look', label: 'Your look' },
  { id: 'build', label: 'Build' },
  { id: 'finish', label: 'Go live' },
]

export const stepIndex = (step: Step): number => STEPS.findIndex(s => s.id === step)

/** What the basics step needs before moving on: a trade (a site exists), a business name and a phone number. */
export type BasicsGap = 'trade' | 'name' | 'phone'

export function basicsGaps(site: { business: Pick<BusinessInfo, 'name' | 'phone'> } | null): BasicsGap[] {
  if (!site) return ['trade']
  const gaps: BasicsGap[] = []
  if (!site.business.name.trim()) gaps.push('name')
  if (!site.business.phone.trim()) gaps.push('phone')
  return gaps
}

/** The trade picked on the homepage (/build/?trade=plumber), if it's one we know. */
export function tradeFromSearch(search: string): TradeId | null {
  const id = new URLSearchParams(search).get('trade')
  return id && (TRADE_IDS as readonly string[]).includes(id) ? (id as TradeId) : null
}
