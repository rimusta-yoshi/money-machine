import { randomSeed } from '../gen'
import type { TradeConfig } from '../types'
import type { Site } from './schema'
import { DEFAULT_THEME, styleRecord } from './style'

/**
 * A blank site for a trade. Content starts unset so nothing invented can be published.
 * The style seed is random unless given, so every new site gets its own look.
 */
export function createSite(trade: TradeConfig, styleSeed: number = randomSeed()): Site {
  return {
    version: 2,
    tradeId: trade.id,
    business: { name: '', phone: '', location: '', about: '', yearsInBusiness: '', email: '' },
    brandColor: trade.colorScheme.accent,
    extras: [],
    style: styleRecord(DEFAULT_THEME[trade.id], trade.colorScheme.accent, styleSeed),
    sections: {},
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
