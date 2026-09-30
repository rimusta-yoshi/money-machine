import { migrateV1, migrateV2, migrateV3 } from './migrate'
import { parseOrThrow, siteSchema, siteSchemaV1, siteSchemaV2, siteSchemaV3 } from './schema'
import type { Site } from './schema'

/** Validates untrusted site data (from storage, the network or a form). Older versions are migrated step by step. */
export function parseSite(input: unknown): Site {
  const version = typeof input === 'object' && input !== null ? (input as { version?: unknown }).version : undefined
  const v3 = (x: unknown) => parseOrThrow(siteSchema, migrateV3(parseOrThrow(siteSchemaV3, x)))
  const v2 = (x: unknown) => v3(migrateV2(parseOrThrow(siteSchemaV2, x)))
  if (version === 1) return v2(migrateV1(parseOrThrow(siteSchemaV1, input)))
  if (version === 2) return v2(input)
  if (version === 3) return v3(input)
  return parseOrThrow(siteSchema, input)
}
