import { handleApi } from '../core/api'
import { depsFrom } from './env'
import type { Env } from './env'

/** api.<base> (the builder's API) and preview.<base> (preview links). */
export default {
  fetch: (req: Request, env: Env) => handleApi(req, depsFrom(env)),
  /** Daily housekeeping (wrangler cron trigger): expired preview links, old rate-limit counters. */
  scheduled: async (_controller: ScheduledController, env: Env) => {
    const deps = depsFrom(env)
    await deps.db.sweep(deps.now())
  },
} satisfies ExportedHandler<Env>
