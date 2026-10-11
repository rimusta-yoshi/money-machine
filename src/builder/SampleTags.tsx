import { useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { PhotoSlotId } from '../site/photoAlt'
import type { SampleSlots } from './sampleSlots'

const LABEL = 'Sample · replace'
const WHAT: Record<PhotoSlotId, string> = { hero: 'main photo', about: 'about photo', gallery: 'gallery photos' }

interface Props {
  slots: SampleSlots
  /** In the section being edited the tag is a button; elsewhere a label (the band itself opens the section). */
  interactive: boolean
  children: ReactNode
}

/**
 * Marks every sample photo in a preview with a small "Sample · replace" tag. The section
 * HTML comes from the generator, so the tags are added to its DOM after each render.
 * Clicks are handled by the builder canvas (it opens the upload for the tag's slot).
 */
export function SampleTagged({ slots, interactive, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    root.querySelectorAll('.mm-sample-tag').forEach(t => t.remove())
    if (!slots.size) return
    root.querySelectorAll('img').forEach(img => {
      const slot = slots.get(img.getAttribute('src') ?? '')
      const box = img.closest('.sb-photo') ?? img.parentElement
      if (!slot || !box) return
      const tag = document.createElement(interactive ? 'button' : 'span')
      tag.className = 'mm-sample-tag'
      tag.dataset.slot = slot
      tag.textContent = LABEL
      if (tag instanceof HTMLButtonElement) {
        tag.type = 'button'
        tag.setAttribute('aria-label', `Sample photo: replace with your own ${WHAT[slot]}`)
      } else {
        tag.setAttribute('aria-hidden', 'true')
      }
      box.appendChild(tag)
    })
  })
  return <div ref={ref}>{children}</div>
}
