import { handleApi } from '../core/api'
import { cleanup } from '../core/cleanup'
import { forgetOldEvents } from '../core/events'
import { depsFrom } from './env'
import type { Env } from './env'

/** api.<base> (the builder's API) and preview.<base> (preview links). */
export default {
  fetch: (req: Request, env: Env, ctx: ExecutionContext) => handleApi(req, depsFrom(env, ctx)),
  /**
   * Daily housekeeping (wrangler cron trigger): expired preview links, holds and counters, then
   * unpaid server copies and their photos after 30 days unused, dashboard events after 13 months.
   */
  scheduled: async (_controller: ScheduledController, env: Env, ctx: ExecutionContext) => {
    const deps = depsFrom(env, ctx)
    await deps.db.sweep(deps.now())
    // Never in the way of the cleanup below.
    await forgetOldEvents(deps).catch(err => console.warn('Forgetting old dashboard events failed', err))
    const done = await cleanup(deps)
    console.log(`Cleanup: ${done.drafts} unpaid drafts and ${done.orphanPhotos} orphan photos removed, ${done.freedAddresses} refunded addresses freed`)
  },
} satisfies ExportedHandler<Env>
