import type { TradeConfig } from '../types'
import type { Site } from './schema'

/** A blank site for a trade. Content starts unset so nothing invented can be published. */
export function createSite(trade: TradeConfig): Site {
  return {
    version: 1,
    tradeId: trade.id,
    business: { name: '', phone: '', location: '', about: '', yearsInBusiness: '', email: '' },
    brandColor: trade.colorScheme.accent,
    extras: [],
    selections: {},
    content: {
      badges: null,
      areas: null,
      hours: null,
      emergency: null,
      jobsDone: null,
      rating: null,
      reviews: null,
      photos: { hero: null, about: null, gallery: [] },
    },
  }
}
