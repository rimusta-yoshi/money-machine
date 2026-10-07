/// <reference types="vite/client" />

/** PRICE_PENCE from server/wrangler.api.jsonc, filled in at build time (vite.config.ts). */
declare const __PRICE_PENCE__: number

interface ImportMetaEnv {
  /** The API's address, e.g. https://api.siteblocks.co.uk. Unset: the builder saves nothing. */
  readonly VITE_API_URL?: string
  /** "true" shows the admin publish form in a production build (dev builds always show it). */
  readonly VITE_ADMIN_PUBLISH?: string
  /** Where the builder's sample stock photos are served from (see reference/sample-photos/LICENCE.md). */
  readonly VITE_SAMPLE_PHOTOS_URL?: string
}
