import { z } from 'zod'
import { CLIENT_STEPS } from '../../src/analytics/funnel'
import type { Step } from '../../src/analytics/funnel'
import { cleanSource, cleanTag } from '../../src/analytics/source'
import type { Source } from '../../src/analytics/source'
import { SECTION_KEYS } from '../../src/gen/core/types'
import { SECTIONS } from '../../src/gen/page'
import { THEME_KEYS } from '../../src/gen/schema'
import { TRADE_IDS } from '../../src/types'
import { HttpError, readBody } from './http'
import { SIZE } from './limits'
import type { Deps, DraftRow } from './ports'
import { DRAFT_KEY, sha256Hex } from './tokens'

/**
 * Anonymous funnel events for the admin dashboard. The homepage and builder report the early
 * steps (POST /v1/events); the server records the rest as they happen (preview link, checkout,
 * payment, refund, dispute). Nothing personal is ever stored: a step, the time, the trade,
 * the theme, the ad source and the site's random id. Recording never holds up or breaks
 * anything: it runs after the response, and failures are only logged.
 */

/** Events and layout picks are deleted after 13 months (daily cron). */
export const KEEP_EVENTS_MONTHS = 13

const tag = z.string().max(200).optional()
const trade = z.enum(TRADE_IDS).optional()
const theme = z.enum(THEME_KEYS).optional()

/** Exactly these fields, nothing else: anything extra (a name, an email) makes the event invalid. */
const eventBody = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('step'), step: z.enum(CLIENT_STEPS), trade, theme, src: tag, campaign: tag }).strict(),
  z.object({ kind: z.literal('layout'), section: z.enum(SECTION_KEYS), layout: z.string().max(60), trade, theme, src: tag, campaign: tag }).strict(),
])
type EventBody = z.infer<typeof eventBody>

/** The trade and theme of a stored record, if they're ones we know. */
export function siteFacts(record: string | null): { trade: string | null; theme: string | null } {
  try {
    const r = record ? (JSON.parse(record) as { tradeId?: unknown; style?: { theme?: unknown } }) : null
    const t = r?.tradeId
    const th = r?.style?.theme
    return {
      trade: typeof t === 'string' && (TRADE_IDS as readonly string[]).includes(t) ? t : null,
      theme: typeof th === 'string' && (THEME_KEYS as readonly string[]).includes(th) ? th : null,
    }
  } catch {
    return { trade: null, theme: null }
  }
}

/** Records a step a site reached on the server (preview, checkout, paid, refunded, disputed). Never awaited. */
export function trackSite(deps: Deps, step: Step, draft: DraftRow): void {
  deps.later(deps.insights.addEvent({ step, at: deps.now(), ...siteFacts(draft.record), ...draft.source, ref: draft.ref }))
}

/** The caller's own draft, from its draft key (edit links don't count: those sites are paid already). */
async function callerDraft(req: Request, deps: Deps): Promise<DraftRow | null> {
  const key = /^Bearer (\S+)$/.exec(req.headers.get('Authorization') ?? '')?.[1] ?? ''
  return DRAFT_KEY.test(key) ? deps.db.draftByKey(await sha256Hex(key)) : null
}

async function readEvent(req: Request): Promise<EventBody> {
  // Plain text too: the homepage sends it that way so the browser needn't ask first (no preflight).
  if (!/^(application\/json|text\/plain)\b/i.test(req.headers.get('Content-Type') ?? '')) throw new HttpError(415, 'bad_type', 'Send JSON.')
  let input: unknown
  try {
    input = JSON.parse(new TextDecoder().decode(await readBody(req, SIZE.smallJson)))
  } catch (err) {
    if (err instanceof HttpError) throw err
    throw new HttpError(400, 'bad_json', 'That request could not be read.')
  }
  const parsed = eventBody.safeParse(input)
  if (!parsed.success) throw new HttpError(422, 'invalid_event', 'That is not an event we record.')
  const e = parsed.data
  if (e.kind === 'layout' && !Object.hasOwn(SECTIONS[e.section].archetypes, e.layout)) throw new HttpError(422, 'invalid_event', 'That is not an event we record.')
  return e
}

async function saveEvent(e: EventBody, req: Request, deps: Deps): Promise<void> {
  // A homepage visit is counted with no id at all.
  const draft = e.kind === 'step' && e.step === 'landed' ? null : await callerDraft(req, deps)
  // A site's source is set once, when its draft is made; its events always carry that one, so a
  // later link (?src=...) never splits one site across two sources.
  const source: Source = draft ? draft.source : { src: cleanSource(e.src), campaign: cleanTag(e.campaign) }
  const at = deps.now()
  const facts = { trade: e.trade ?? null, theme: e.theme ?? null, src: source.src, ref: draft?.ref ?? null }
  if (e.kind === 'layout') await deps.insights.addPick({ at, section: e.section, layout: e.layout, ...facts })
  else await deps.insights.addEvent({ step: e.step, at, ...facts, campaign: source.campaign })
}

/** POST /v1/events: a step or a layout pick from the homepage or builder. Answers at once; the write happens after. */
export async function recordEvent(req: Request, deps: Deps): Promise<Response> {
  const e = await readEvent(req)
  if (await deps.allowEvent(req)) deps.later(saveEvent(e, req, deps))
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
}

/** Daily: events and picks older than 13 months go. */
export async function forgetOldEvents(deps: Pick<Deps, 'insights' | 'now'>): Promise<number> {
  const now = new Date(deps.now())
  const before = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - KEEP_EVENTS_MONTHS, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes())
  await deps.insights.forgetBefore(before)
  return before
}
