import type { Generated, SectionKey } from '../gen'
import { tradeById } from '../trades'
import type { Locks, Site } from './schema'
import { DEFAULT_THEME } from './style'

/**
 * The customer's own choices are locked: their colour, their style (theme) and every
 * layout they chose in the build step. Locked choices change only when the customer
 * changes them; switching trade, re-rolling one section, re-solving the page rhythm or
 * generating defaults never touch them. Content is always the customer's own and is never
 * changed by generation either.
 *
 * Layouts nobody chose (defaults saved on the way to go live) stay unlocked, so the
 * generator may still replace them.
 */

export const NO_LOCKS: Locks = {}

/** A section entry the customer picked. */
export const lockedEntry = (value: Generated): Generated => ({ seed: value.seed, spec: value.spec, locked: true })

/** A section entry the builder chose for them (never visited before going live). */
export const defaultEntry = (value: Generated): Generated => ({ seed: value.seed, spec: value.spec })

export const isLocked = (site: Pick<Site, 'sections'>, type: SectionKey): boolean =>
  !!(site.sections[type] as Generated | undefined)?.locked

/**
 * Records saved before locks existed: anything that differs from the trade's starting
 * point was the customer's choice, and every saved layout was one they saw and kept.
 */
export function withInferredLocks(site: Site): Site {
  if (site.locks) return site
  const trade = tradeById[site.tradeId]
  const locks: Locks = {
    ...(site.brandColor.toUpperCase() !== trade.colorScheme.accent.toUpperCase() ? { brandColor: true as const } : {}),
    ...(site.style.theme !== DEFAULT_THEME[site.tradeId] ? { theme: true as const } : {}),
  }
  const sections = Object.fromEntries(Object.entries(site.sections).map(([type, entry]) => [type, { ...entry, locked: true }]))
  return { ...site, locks, sections }
}
