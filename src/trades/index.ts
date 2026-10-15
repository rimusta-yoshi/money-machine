import { PACKS } from '../packs'
import type { PackCore, TradeId } from '../packs'
import { isBuilt } from '../packs/sections'
import type { TradeConfig } from '../types'

/**
 * The trades as the builder and generator see them, read from the business-type packs
 * (src/packs). Nothing about a trade is written here: edit its pack.
 */
export function toTradeConfig(pack: PackCore & { id: TradeId }): TradeConfig {
  return {
    id: pack.id,
    name: pack.name,
    emoji: pack.emoji,
    tagline: pack.copy.tagline,
    headlines: pack.headlines,
    colorScheme: pack.look.colours,
    // Planned sections wait until they're built (pack:check reports them).
    sections: pack.sections.flatMap(s => (isBuilt(s.type) ? [{ type: s.type }] : [])),
    ctaText: pack.copy.cta,
    ctaSubtext: pack.copy.ctaNote,
    offer: pack.copy.offer,
    trustSignals: pack.badges,
    services: pack.services.map(s => s.name),
    stickyCallBar: pack.stickyCallBar,
  }
}

export const trades: TradeConfig[] = PACKS.map(toTradeConfig)

export const tradeById = Object.fromEntries(trades.map(t => [t.id, t])) as Record<TradeId, TradeConfig>
