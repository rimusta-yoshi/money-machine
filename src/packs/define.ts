import type { PackCore } from './schema'

/**
 * Declares a pack's core (everything but its landing page), keeping its id as a literal type so
 * TradeId stays a union of known ids. Only types come from ./schema: the builder's bundle
 * doesn't need the pack validator.
 */
export const definePack = <const Id extends string>(pack: PackCore & { id: Id }): PackCore & { id: Id } => pack
