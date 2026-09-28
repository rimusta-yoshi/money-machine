import type { TradeConfig } from '../types'
import type { Site } from './schema'

export type PhotoSlotId = 'hero' | 'about' | 'gallery'

/**
 * A starting description for a new photo, so no image is ever saved without alt text.
 * The customer is asked to make it more specific.
 */
export function defaultAlt(slot: PhotoSlotId, site: Site, trade: TradeConfig, index = 0): string {
  const name = site.business.name.trim() || `${trade.name} Co.`
  const trade1 = trade.name.toLowerCase()
  const place = site.business.location.trim()
  if (slot === 'hero') return `${name} at work${place ? ` in ${place}` : ''}`
  if (slot === 'about') return `The ${name} team`
  return `Recent ${trade1} job ${index + 1}${place ? ` in ${place}` : ''} by ${name}`
}
