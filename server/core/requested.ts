import { z } from 'zod'
import { cleanRequestedType } from '../../src/analytics/requested'
import { TRADE_IDS } from '../../src/types'
import { HttpError, readBody } from './http'
import { SIZE } from './limits'
import type { Deps } from './ports'

/**
 * POST /v1/requested-types: "My business isn't listed" on the builder's first step. Counts what
 * the business is (cleaned, see src/analytics/requested.ts) and the type we suggested, for the
 * dashboard's "Requested business types". Anonymous: no draft key, no source, nothing about the
 * visitor. Answers at once; the write happens after, and never breaks anything.
 */

export const REQUESTED_SHOWN = 50

const body = z.object({ text: z.string().max(200), closest: z.enum(TRADE_IDS).optional() }).strict()

export async function recordRequestedType(req: Request, deps: Deps): Promise<Response> {
  if (!/^(application\/json|text\/plain)\b/i.test(req.headers.get('Content-Type') ?? '')) throw new HttpError(415, 'bad_type', 'Send JSON.')
  let input: unknown
  try {
    input = JSON.parse(new TextDecoder().decode(await readBody(req, SIZE.smallJson)))
  } catch (err) {
    if (err instanceof HttpError) throw err
    throw new HttpError(400, 'bad_json', 'That request could not be read.')
  }
  const parsed = body.safeParse(input)
  if (!parsed.success) throw new HttpError(422, 'invalid_request', 'That is not something we record.')
  const text = cleanRequestedType(parsed.data.text)
  // Something that isn't a business description (an email, a phone number) is quietly not kept.
  if (text && await deps.allowEvent(req)) {
    const at = deps.now()
    deps.later(deps.insights.addRequestedType({ text, closest: parsed.data.closest ?? null, at }))
  }
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
}
