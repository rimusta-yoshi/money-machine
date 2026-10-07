import { handleApi } from '../core/api'
import { cleanup } from '../core/cleanup'
import { depsFrom } from './env'
import type { Env } from './env'

/** api.<base> (the builder's API) and preview.<base> (preview links). */
export default {
  fetch: (req: Request, env: Env) => handleApi(req, depsFrom(env)),
  /**
   * Daily housekeeping (wrangler cron trigger): expired preview links, holds and counters, then
   * unpaid server copies and their photos after 30 days unused.
   */
  scheduled: async (_controller: ScheduledController, env: Env) => {
    const deps = depsFrom(env)
    await deps.db.sweep(deps.now())
    const done = await cleanup(deps)
    console.log(`Cleanup: ${done.drafts} unpaid drafts and ${done.orphanPhotos} orphan photos removed, ${done.freedAddresses} refunded addresses freed`)
  },
} satisfies ExportedHandler<Env>
