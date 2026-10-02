/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The API's address, e.g. https://api.siteblocks.co.uk. Unset: the builder saves nothing. */
  readonly VITE_API_URL?: string
  /** "true" shows the admin publish form in a production build (dev builds always show it). */
  readonly VITE_ADMIN_PUBLISH?: string
  /** Where the builder's sample stock photos are served from (see reference/sample-photos/LICENCE.md). */
  readonly VITE_SAMPLE_PHOTOS_URL?: string
}
