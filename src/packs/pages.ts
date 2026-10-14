import { electricianLanding } from './business/electrician'
import { landscaperLanding } from './business/landscaper'
import { painterLanding } from './business/painter'
import { plumberLanding } from './business/plumber'
import { rooferLanding } from './business/roofer'
import { PACKS } from '.'
import type { LivePack, TradeId } from '.'
import type { PackLanding } from './schema'

/**
 * Each live pack's landing page (its `<id>Landing` export), for the "Websites for…" pages and
 * pack:check. Only build-time code imports this, so the builder never carries the page copy.
 * Adding a type: one line here as well as in ./index.ts (TypeScript says if one is missing).
 */
const LANDINGS = {
  plumber: plumberLanding,
  painter: painterLanding,
  roofer: rooferLanding,
  electrician: electricianLanding,
  landscaper: landscaperLanding,
} satisfies Record<TradeId, PackLanding>

export type PagePack = LivePack & { landing: PackLanding }

/** Every live pack with its landing page, in PACKS order. */
export const PAGE_PACKS: readonly PagePack[] = PACKS.map(p => ({ ...p, landing: LANDINGS[p.id] }))
