/**
 * The one price. It's set only in the API worker's config (PRICE_PENCE in
 * server/wrangler.api.jsonc): pages are built with that value, and the builder shows the live
 * server's own answer (GET /v1/config) once it has it.
 */
import { money } from './money'

export const BUILT_PRICE_PENCE: number = __PRICE_PENCE__

export { money }

/** The price said plainly, e.g. £99. */
export const PRICE = money(BUILT_PRICE_PENCE)
