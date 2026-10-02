import { handleSite } from '../core/site'
import { depsFrom } from './env'
import type { Env } from './env'

/** <slug>.<base>: published customer sites, served from storage. */
export default {
  fetch: (req: Request, env: Env) => handleSite(req, depsFrom(env)),
} satisfies ExportedHandler<Env>
