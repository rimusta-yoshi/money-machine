/// <reference types="vite/client" />

/** PRICE_PENCE from server/wrangler.api.jsonc, filled in at build time (vite.config.ts). */
declare const __PRICE_PENCE__: number
/** The homepage's trade chips: every pack marked `featured`, filled in at build time (vite.config.ts) so the homepage never loads the packs. */
declare const __FEATURED_TRADES__: { id: import('./packs').TradeId; label: string }[]

interface ImportMetaEnv {
  /** The API's address, e.g. https://api.localblocks.co.uk. Unset: the builder saves nothing. */
  readonly VITE_API_URL?: string
  /** "true" shows the admin publish form in a production build (dev builds always show it). */
  readonly VITE_ADMIN_PUBLISH?: string
  /** Where the builder's sample stock photos are served from (see reference/sample-photos/LICENCE.md). */
  readonly VITE_SAMPLE_PHOTOS_URL?: string
}
