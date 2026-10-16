import type { ObjectInfo, ObjectStore } from './types'

/** Every object under a prefix, page by page (`meta`: with custom metadata). */
export async function listAll(store: ObjectStore, prefix: string, meta = false): Promise<ObjectInfo[]> {
  const out: ObjectInfo[] = []
  let cursor: string | undefined
  do {
    const page = await store.page(prefix, { cursor, meta })
    out.push(...page.objects)
    cursor = page.cursor
  } while (cursor)
  return out
}
