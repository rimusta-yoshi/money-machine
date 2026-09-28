import { useMemo, useState } from 'react'
import { ARCHETYPES, nextBatchSeed, specKey } from '../gen'
import type { GeneratedHero, HeroSpec } from '../gen'
import type { TradeConfig } from '../types'
import { heroContent } from '../site/heroContent'
import type { Site } from '../site/schema'
import { firstHeroBatch } from '../site/style'
import { useHeroOptions } from './useHeroOptions'

/**
 * The hero "carousel": the generator's options for the current batch seed, which one is
 * showing, and a re-roll. Starts from the stored seed, so revisiting shows the same six.
 */
export function useHeroPicker(site: Site, trade: TradeConfig) {
  const stored = site.sections.hero
  const content = useMemo(() => heroContent(site, trade), [site, trade])
  const [batchSeed, setBatchSeed] = useState(() => stored?.seed ?? firstHeroBatch(site.style.seed))
  const { options, pending } = useHeroOptions(content, site.style.resolved, batchSeed)
  // The customer's browsing choice, remembered against the saved pick it started from. If the
  // saved pick changes underneath (fit repair) and belongs to the batch on screen, follow it;
  // otherwise leave the customer where they are.
  const storedKey = stored ? specKey(stored.spec) : null
  const [choice, setChoice] = useState<{ key: string | null; base: string | null }>({ key: storedKey, base: storedKey })
  const follow = choice.base !== storedKey && stored?.seed === batchSeed
  const shownKey = follow ? storedKey : choice.key
  const setShownKey = (key: string | null) => setChoice({ key, base: storedKey })

  const specs = useMemo<HeroSpec[]>(() => {
    const generated = options?.shown.map(c => c.spec) ?? []
    // The saved pick stays available even if the content has since changed the batch.
    const keepStored = stored && stored.seed === batchSeed && !generated.some(s => specKey(s) === specKey(stored.spec))
    return keepStored ? [stored.spec, ...generated] : generated
  }, [options, stored, batchSeed])

  const index = Math.max(0, specs.findIndex(s => specKey(s) === shownKey))
  const shown: HeroSpec | undefined = specs[index] ?? (stored?.seed === batchSeed ? stored.spec : undefined)

  return {
    content,
    shown,
    index,
    count: specs.length,
    label: shown ? ARCHETYPES[shown.archetype].label : 'Generating options',
    loading: options === null || pending,
    cycle: (dir: 1 | -1) => {
      if (specs.length < 2) return
      setShownKey(specKey(specs[(index + dir + specs.length) % specs.length]))
    },
    reroll: () => {
      setBatchSeed(nextBatchSeed(batchSeed))
      setShownKey(null)
    },
    /** The pick to save, or null while a new batch is still generating. */
    pick: (): GeneratedHero | null => (shown && !pending ? { seed: batchSeed, spec: shown } : null),
  }
}

export type HeroPicker = ReturnType<typeof useHeroPicker>
