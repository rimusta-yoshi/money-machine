import { redirect } from '../core/redirect'

interface Env {
  /** The domain we moved from, e.g. siteblocks.co.uk. */
  OLD_DOMAIN: string
  /** The domain we moved to: the same value as BASE_DOMAIN in the other configs. */
  NEW_DOMAIN: string
}

/** The old domain: everything on it redirects to the new one (server/core/redirect.ts). */
export default {
  fetch: (req: Request, env: Env) => redirect(req, env.OLD_DOMAIN, env.NEW_DOMAIN),
} satisfies ExportedHandler<Env>
