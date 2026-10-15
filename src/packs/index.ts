import { electrician } from './business/electrician'
import { landscaper } from './business/landscaper'
import { painter } from './business/painter'
import { plumber } from './business/plumber'
import { roofer } from './business/roofer'
import type { Pack } from './schema'

/**
 * Every business type the builder offers, in the order the trade picker shows them. Adding a
 * type: one file in ./business, its photos, and one line here (docs/adding-a-business-type.md).
 * `npm run pack:check` fails if a file in ./business isn't listed here or in WAITING_PACKS.
 */
export const PACKS = [plumber, painter, roofer, electrician, landscaper] as const

/**
 * Packs written before a section they need exists (a required section in PLANNED_SECTIONS).
 * They're checked like the rest but never offered: pack:check reports them as "blocked on
 * section X". Move a pack up to PACKS once its sections are built.
 */
export const WAITING_PACKS: readonly Pack[] = []

export type LivePack = typeof PACKS[number]
export type TradeId = LivePack['id']

/** The live ids, for validating records and events (a zod enum needs at least one). */
export const TRADE_IDS = PACKS.map(p => p.id) as unknown as readonly [TradeId, ...TradeId[]]

export const packById = Object.fromEntries(PACKS.map(p => [p.id, p])) as unknown as Record<TradeId, LivePack>

export const isTradeId = (id: string): id is TradeId => (TRADE_IDS as readonly string[]).includes(id)

export { CATEGORIES } from './categories'
export type { Category } from './categories'
export type { Pack, PackCore, PackExample, PackLanding, PackPhoto } from './schema'
