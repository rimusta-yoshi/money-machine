import { useMemo, useState } from 'react'
import { nextBatchSeed, sectionBatch, SECTIONS, specKey, viewOf } from '../gen'
import type { AnySpec, Generated, PageContent, SectionKey } from '../gen'
import type { Site } from '../site/schema'
import { useSectionOptions } from './useSectionOptions'

type Choice = { key: string | null; base: string | null }

/**
 * A section's "carousel": the generator's options for the current batch seed, which one
 * is showing, and a re-roll. Starts from the stored seed, so revisiting shows the same
 * options. Browsing state is kept per section, so moving between sections keeps each place.
 */
export function useSectionPicker(site: Site, content: PageContent, type: SectionKey) {
  const def = SECTIONS[type]
  const stored = site.sections[type] as Generated | undefined
  const view = useMemo(() => viewOf(type, content), [type, content])
  const [seeds, setSeeds] = useState<Partial<Record<SectionKey, number>>>({})
  const batchSeed = seeds[type] ?? stored?.seed ?? sectionBatch(site.style.seed, type)
  const { options, pending } = useSectionOptions(type, view, site.style.resolved, batchSeed)

  // The customer's browsing choice, remembered against the saved pick it started from. If the
  // saved pick changes underneath (fit repair) and belongs to the batch on screen, follow it;
  // otherwise leave the customer where they are.
  const storedKey = stored ? specKey(stored.spec) : null
  const [choices, setChoices] = useState<Partial<Record<SectionKey, Choice>>>({})
  const choice = choices[type] ?? { key: storedKey, base: storedKey }
  const follow = choice.base !== storedKey && stored?.seed === batchSeed
  const shownKey = follow ? storedKey : choice.key
  const setShownKey = (key: string | null) => setChoices(c => ({ ...c, [type]: { key, base: storedKey } }))

  const specs = useMemo<AnySpec[]>(() => {
    const generated = options && options.batchSeed === batchSeed ? options.shown.map(c => c.spec) : []
    // The saved pick stays available even if the content has since changed the batch.
    const keepStored = stored && stored.seed === batchSeed && !generated.some(s => specKey(s) === specKey(stored.spec))
    return keepStored ? [stored.spec, ...generated] : generated
  }, [options, stored, batchSeed])

  const index = Math.max(0, specs.findIndex(s => specKey(s) === shownKey))
  const shown: AnySpec | undefined = specs[index] ?? (stored?.seed === batchSeed ? stored.spec : undefined)

  return {
    shown,
    index,
    count: specs.length,
    label: shown ? def.archetypes[shown.archetype]?.label ?? '' : 'Generating layouts',
    loading: options === null || pending,
    cycle: (dir: 1 | -1) => {
      if (specs.length < 2) return
      setShownKey(specKey(specs[(index + dir + specs.length) % specs.length]))
    },
    reroll: () => {
      setSeeds(s => ({ ...s, [type]: nextBatchSeed(batchSeed) }))
      setShownKey(null)
    },
    /** The pick to save, or null while a new batch is still generating. */
    pick: (): Generated | null => (shown && !pending ? { seed: batchSeed, spec: shown } : null),
  }
}

export type SectionPicker = ReturnType<typeof useSectionPicker>
