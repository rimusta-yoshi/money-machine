import { migrateV1 } from './migrate'
import { parseOrThrow, siteSchema, siteSchemaV1 } from './schema'
import type { Site } from './schema'

/** Validates untrusted site data (from storage, the network or a form). v1 records are migrated. */
export function parseSite(input: unknown): Site {
  const version = typeof input === 'object' && input !== null ? (input as { version?: unknown }).version : undefined
  if (version === 1) return parseOrThrow(siteSchema, migrateV1(parseOrThrow(siteSchemaV1, input)))
  return parseOrThrow(siteSchema, input)
}
