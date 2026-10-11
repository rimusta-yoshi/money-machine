import { useEffect } from 'react'
import type { AnySpec, SectionKey } from '../gen'
import type { Site } from '../site/schema'

/**
 * Dev only: "Copy debug info" (Alt+Shift+D) copies everything needed to reproduce what the
 * builder is showing: the site record (photos swapped for stand-ins, so it stays small),
 * the step, and in the build step the section being edited with its batch seed and the
 * options on screen. Paste it into a file and run `npm run repro -- <file>`.
 */

export interface BuildDebug {
  section: SectionKey
  batchSeed: number
  /** Which option is showing, and all of them. */
  index: number
  shown: readonly AnySpec[]
  loading: boolean
  /** Whether the preview filled empty photo slots with samples. */
  samples: boolean
}

export interface DebugInfo {
  kind: 'siteblocks-debug'
  v: 1
  at: string
  step: string
  site: Site
  build: BuildDebug | null
}

/** What the build step is showing right now (set by the builder canvas in dev builds). */
export const buildDebug: { current: BuildDebug | null } = { current: null }

/** Photos become short stand-in links that still pass the record's photo rules. */
function standIns(site: Site): Site {
  let n = 0
  const swap = <P extends { url: string; alt: string } | null>(p: P): P => (p ? { ...p, url: `https://photo.invalid/own-${++n}.jpg` } : p)
  const photos = site.content.photos
  return { ...site, content: { ...site.content, photos: { hero: swap(photos.hero), about: swap(photos.about), gallery: photos.gallery.map(swap) } } }
}

export function debugInfo(site: Site, step: string, build: BuildDebug | null, now = new Date()): DebugInfo {
  return { kind: 'siteblocks-debug', v: 1, at: now.toISOString(), step, site: standIns(site), build: step === 'build' ? build : null }
}

/** Alt+Shift+D copies the debug info (dev builds only). */
export function useDebugShortcut(get: () => DebugInfo | null, onCopied: (ok: boolean) => void) {
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const onKey = (e: KeyboardEvent) => {
      if (!(e.altKey && e.shiftKey && e.code === 'KeyD')) return
      const info = get()
      if (!info) return
      e.preventDefault()
      navigator.clipboard.writeText(JSON.stringify(info, null, 2)).then(() => onCopied(true), () => onCopied(false))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [get, onCopied])
}
