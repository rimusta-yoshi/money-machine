import { handleApi } from '../core/api'
import { catchUpFiles, nightlyBackup } from '../core/backup/run'
import { cleanup } from '../core/cleanup'
import { sweepDomains } from '../core/domainLifecycle'
import { forgetOldEvents } from '../core/events'
import { backfillFees } from '../core/fees'
import { sendResumeReminders } from '../core/resume'
import { depsFrom } from './env'
import type { Env } from './env'

/** The quarter-hourly cron (wrangler.api.jsonc): own domains waiting to go live, nothing else. Not exported: a worker's named exports are entry points. */
const DOMAIN_CRON = '*/15 * * * *'
/** The nightly backup (server/core/backup), half an hour before the cleanup so it can't lose anything the cleanup deletes by mistake. */
const BACKUP_CRON = '47 2 * * *'

/** api.<base> (the builder's API) and preview.<base> (preview links). */
export default {
  fetch: (req: Request, env: Env, ctx: ExecutionContext) => handleApi(req, depsFrom(env, ctx)),
  /**
   * Daily housekeeping (wrangler cron trigger): expired preview links, holds and counters, then
   * unpaid server copies and their photos after 30 days unused, dashboard events after 13 months,
   * "remind me" emails due, and own domains whose site has ended. Every 15 minutes: own domains waiting to go live.
   */
  scheduled: async (controller: ScheduledController, env: Env, ctx: ExecutionContext) => {
    const deps = depsFrom(env, ctx)
    if (controller.cron === DOMAIN_CRON) {
      const d = await sweepDomains(deps, { daily: false })
      if (d.checked || d.removed || d.paused || d.resumed || d.gaveUp) console.log(`Own domains: ${d.checked} checked, ${d.removed} removed, ${d.paused} paused, ${d.resumed} resumed, ${d.gaveUp} given up`)
      // A pass of the backed-up files too big for one night carries on here.
      const files = deps.backups ? await catchUpFiles(deps.backups, deps.now()).catch(err => { console.error('Backing up files failed', err); return null }) : null
      if (files) console.log(`Backup files: ${files}`)
      return
    }
    if (controller.cron === BACKUP_CRON) {
      if (!deps.backups) return console.warn('Backups are off: no BACKUPS bucket is bound (server/README.md "Backups and restore").')
      const b = await nightlyBackup(deps.backups, deps.now())
      console.log(`Backup: database ${b.db}; files ${b.files}; ${b.pruned}`)
      return
    }
    await deps.db.sweep(deps.now())
    // Never in the way of the cleanup below.
    await forgetOldEvents(deps).catch(err => console.warn('Forgetting old dashboard events failed', err))
    await backfillFees(deps).catch(err => console.warn('Filling in Stripe fees failed', err))
    const done = await cleanup(deps)
    console.log(`Cleanup: ${done.drafts} unpaid drafts and ${done.orphanPhotos} orphan photos removed, ${done.freedAddresses} refunded addresses freed`)
    // "Remind me" on an emailed resume link: the one reminder, three days on.
    const reminded = await sendResumeReminders(deps).catch(err => { console.warn('Sending resume reminders failed', err); return 0 })
    if (reminded) console.log(`Resume reminders: ${reminded} sent`)
    // Refunded, disputed and deleted sites' domains come off Cloudflare (the payment webhooks do it at once; this catches the rest).
    const d = await sweepDomains(deps, { daily: true })
    console.log(`Own domains: ${d.checked} checked, ${d.removed} removed, ${d.paused} paused, ${d.resumed} resumed, ${d.gaveUp} given up`)
  },
} satisfies ExportedHandler<Env>
