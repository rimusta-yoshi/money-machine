import type { ObjectInfo, ObjectStore } from './types'

/** Every object under a prefix, page by page. */
export async function listAll(store: ObjectStore, prefix: string): Promise<ObjectInfo[]> {
  const out: ObjectInfo[] = []
  let startAfter: string | undefined
  for (;;) {
    const page = await store.page(prefix, { startAfter })
    out.push(...page.objects)
    if (!page.more || !page.objects.length) return out
    startAfter = page.objects[page.objects.length - 1].key
  }
}
