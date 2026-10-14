// Shared by pack:check and pack:images: loads TypeScript from src/ through Vite (so the
// generator and packs run in Node unchanged) and reads what the pack checks need from disk.
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

export const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Runs `fn` with a loader for src/ modules, then closes Vite. */
export async function withSrc(fn) {
  const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  try {
    return await fn(path => server.ssrLoadModule(path))
  } finally {
    await server.close()
  }
}

function filesUnder(dir) {
  try {
    return readdirSync(dir, { recursive: true, withFileTypes: true })
      .filter(d => d.isFile())
      .map(d => relative(dir, join(d.parentPath, d.name)).split(sep).join('/'))
  } catch {
    return []
  }
}

/** What checkPacks reads from disk. */
export function packCheckInput(live, waiting) {
  const photos = join(root, 'reference', 'sample-photos')
  return {
    live,
    waiting,
    packFiles: readdirSync(join(root, 'src', 'packs', 'business')).filter(f => f.endsWith('.ts')).map(f => f.slice(0, -3)),
    photoFiles: new Set(readdirSync(photos).filter(f => f.endsWith('.jpg'))),
    licence: readFileSync(join(photos, 'LICENCE.md'), 'utf8'),
    publicFiles: new Set(filesUnder(join(root, 'public'))),
  }
}
