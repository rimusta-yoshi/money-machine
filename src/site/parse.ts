import { migrateV1, migrateV2 } from './migrate'
import { parseOrThrow, siteSchema, siteSchemaV1, siteSchemaV2 } from './schema'
import type { Site } from './schema'

/** Validates untrusted site data (from storage, the network or a form). Older versions are migrated step by step. */
export function parseSite(input: unknown): Site {
  const version = typeof input === 'object' && input !== null ? (input as { version?: unknown }).version : undefined
  if (version === 1) return parseOrThrow(siteSchema, migrateV2(parseOrThrow(siteSchemaV2, migrateV1(parseOrThrow(siteSchemaV1, input)))))
  if (version === 2) return parseOrThrow(siteSchema, migrateV2(parseOrThrow(siteSchemaV2, input)))
  return parseOrThrow(siteSchema, input)
}
