import { useState, useRef, useEffect, useLayoutEffect, useMemo, useReducer } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { BusinessInfo, SectionType, TradeConfig } from '../types'
import { sectionPresent, specKey, THEMES } from '../gen'
import type { Generated, PageContent, ResolvedSection, SectionKey } from '../gen'
import type { Site, SiteContent } from '../site/schema'
import { siteSections } from '../site/sections'
import { SECTION_LABELS } from '../site/labels'
import { SECTION_NEEDS } from '../site/needs'
import { sitePage } from '../site/page'
import { pageContent } from '../site/pageContent'
import { withSample } from '../sample/content'
import { GeneratedSection } from '../components/sections/GeneratedSection'
import { Icon } from '../components/ui/Icon'
import { ControlRail } from './ControlRail'
import { PhoneBar } from './phone/PhoneBar'
import { PhoneEditor } from './phone/PhoneEditor'
import { PHONE_FLOW_START, phoneFlow, previewHeight } from './phone/phoneFlow'
import { useVisualViewport } from './phone/useVisualViewport'
import type { LayoutState, SectionNavProps } from './sectionNav'
import { useSectionPicker } from './useSectionPicker'
import { useNarrow } from './useNarrow'
import { SampleTagged } from './SampleTags'
import { sampleSlots } from './sampleSlots'
import { buildDebug } from './debugInfo'
import { usePhotoPicker } from './content/usePhotoPicker'
import { defaultAlt } from '../site/photoAlt'
import type { PhotoSlotId } from '../site/photoAlt'

interface Props {
  trade: TradeConfig
  site: Site
  /** What to lay out: the customer's content plus any sample photos or text (see usePreviewContent). */
  content?: PageContent
  mobile: boolean
  /** Section to open on, e.g. when coming back from the go-live step to add something. */
  initialSection?: SectionType
  onPick: (section: SectionKey, value: Generated) => void
  onContentChange: (patch: Partial<SiteContent>) => void
  onBusinessChange: (patch: Partial<BusinessInfo>) => void
  onDone: () => void
  /** Back to step 2. */
  onChangeLook: () => void
  /** Phones: "Email me a link to finish on my computer", shown with a section's fields. */
  resume?: ReactNode
}

const DESK_W = 1200

export function BuilderCanvas({ trade, site, content: preview, mobile, initialSection, onPick, onContentChange, onBusinessChange, onDone, onChangeLook, resume }: Props) {
  const sections = siteSections(trade, site)
  const [activeIdx, setActiveIdx] = useState(() => Math.max(0, sections.findIndex(s => s.type === initialSection)))
  const [zoom, setZoom] = useState(1)
  const [innerH, setInnerH] = useState(0)
  const isNarrowDevice = useNarrow()
  const bandRefs = useRef<(HTMLDivElement | null)[]>([])
  const stackScrollRef = useRef<HTMLElement | null>(null)
  const zoomInnerRef = useRef<HTMLDivElement | null>(null)
  const touchStartX = useRef<number | null>(null)
  // Phones: one section at a time, its layouts in a slim bar, its fields only on "Edit".
  const [flow, dispatchFlow] = useReducer(phoneFlow, PHONE_FLOW_START)
  const editing = isNarrowDevice && flow.mode === 'edit'
  const viewport = useVisualViewport(editing)
  const editRef = useRef<HTMLButtonElement | null>(null)
  const refocusEdit = useRef(false)
  /** The part of the section the focused field shows, kept in view above the fields. */
  const watched = useRef<string | null>(null)
  const barRef = useRef<HTMLDivElement | null>(null)

  const activeType = sections[activeIdx]?.type ?? 'hero'
  // Sample photos and text are view-only: they never reach the record, so they can't be saved or published.
  const own = useMemo(() => pageContent(site, trade), [site, trade])
  const content = useMemo(() => preview ?? own, [preview, own])
  const samples = useMemo(() => sampleSlots(own, content), [own, content])
  // "Sample · replace" on a preview photo opens the upload for its slot.
  const upload = usePhotoPicker()
  const uploadRef = useRef<HTMLInputElement | null>(null)
  const uploadFor = useRef<PhotoSlotId | null>(null)
  const latestSite = useRef(site)
  useEffect(() => { latestSite.current = site })
  // Sections still waiting for the customer's content are laid out on sample content, so
  // their layouts can be browsed and picked in advance. The pick goes live with real content.
  const sampled = useMemo(() => withSample(content, [], THEMES[site.style.theme].voice.why), [content, site.style.theme])
  const typesKey = sections.map(s => s.type).join(',')
  const waitingTypes = useMemo(
    () => (typesKey.split(',') as SectionKey[]).filter(t => !sectionPresent(t, content)),
    [typesKey, content],
  )
  const isWaiting = (type: SectionKey) => waitingTypes.includes(type)
  const contentFor = (type: SectionKey) => (isWaiting(type) ? sampled : content)
  const picker = useSectionPicker(site, contentFor(activeType), activeType)
  // The whole page with the option being browsed swapped in: the rhythm re-solves around it.
  const page = useMemo(
    () => sitePage(site, trade, { overrides: picker.shown ? { [activeType]: picker.shown } : {}, content, samples: { content: sampled, types: waitingTypes } }),
    [site, trade, activeType, picker.shown, content, sampled, waitingTypes],
  )
  const byType = useMemo(() => new Map<SectionKey, ResolvedSection>(page.map(s => [s.type, s])), [page])
  // Dev builds: what's on screen, for "Copy debug info" (Alt+Shift+D).
  useEffect(() => {
    if (!import.meta.env.DEV) return
    buildDebug.current = { section: activeType, batchSeed: picker.batchSeed, index: picker.index, shown: picker.specs, loading: picker.loading, samples: samples.size > 0 }
  })

  const effectiveMobile = mobile || (isNarrowDevice && !(editing && flow.size === 'computer'))

  useLayoutEffect(() => {
    if (effectiveMobile) return
    const inner = zoomInnerRef.current
    const outer = inner?.parentElement
    if (!inner || !outer) return
    const compute = () => {
      const z = Math.min(1, outer.clientWidth / DESK_W)
      setZoom(prev => Math.abs(prev - z) > 0.001 ? z : prev)
      const h = inner.scrollHeight
      setInnerH(prev => prev !== h ? h : prev)
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(outer)
    ro.observe(inner)
    return () => ro.disconnect()
  }, [effectiveMobile, activeIdx, page])

  useEffect(() => {
    const el = bandRefs.current[activeIdx]
    if (!el) return
    if (isNarrowDevice) {
      if (!editing) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
      return
    }
    const sc = stackScrollRef.current
    if (!sc) return
    const offset = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 22
    sc.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' })
  }, [activeIdx, effectiveMobile, zoom, isNarrowDevice, editing])

  /** While editing on a phone: scrolls the preview above the fields to what the focused field changes. */
  const reveal = (selector: string | null) => {
    watched.current = selector
    const pane = stackScrollRef.current
    const band = bandRefs.current[activeIdx]
    if (!pane || !band) return
    const target = (selector && band.querySelector(selector)) || band
    // A little of what's above stays in view too, so the edited part keeps its context.
    const offset = target.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop - 32
    pane.scrollTo({ top: Math.max(0, offset) })
  }
  // On opening the fields, when the keyboard opens or closes, and when the preview size changes.
  useEffect(() => {
    if (editing) reveal(watched.current)
  })

  // Back on the bar after the fields close: focus returns to its Edit button.
  useEffect(() => {
    if (!editing && refocusEdit.current) {
      refocusEdit.current = false
      editRef.current?.focus()
    }
  })

  // The bar's height, so notices float above it rather than over it.
  useLayoutEffect(() => {
    const bar = barRef.current
    if (!isNarrowDevice || !bar) return
    const root = document.documentElement
    const set = () => root.style.setProperty('--phone-bar-h', `${bar.offsetHeight}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(bar)
    return () => { ro.disconnect(); root.style.removeProperty('--phone-bar-h') }
  }, [isNarrowDevice, editing])


  const present = (type: SectionKey) => byType.has(type)
  const isConfirmed = (type: SectionKey) => !!site.sections[type]

  /**
   * Saves whatever layout is showing for the active section, if the customer moved to a
   * different one. Just passing through keeps the saved entry as it is (including a
   * remembered pick from a fit repair).
   */
  const confirmActive = () => {
    const pick = present(activeType) ? picker.pick() : null
    const saved = site.sections[activeType] as Generated | undefined
    const unchanged = saved && pick && saved.seed === pick.seed && specKey(saved.spec) === specKey(pick.spec)
    if (pick && !unchanged) onPick(activeType, pick)
  }
  // A section can't be saved until its options are ready.
  const busy = present(activeType) && picker.loading
  const navigateTo = (newIdx: number) => {
    if (newIdx === activeIdx || busy) return
    confirmActive()
    setActiveIdx(newIdx)
    dispatchFlow({ type: 'moved' })
  }
  const finish = () => {
    if (busy) return
    confirmActive()
    dispatchFlow({ type: 'moved' })
    onDone()
  }
  // Sections waiting for content, or not built yet, show a blank band until visited.
  const showPlaceholder = (sIdx: number) => {
    const type = sections[sIdx].type
    return !present(type) || (sIdx !== activeIdx && !isConfirmed(type))
  }

  /** The section as it should appear in its band, keyed so a layout change re-animates. */
  const renderBand = (sIdx: number): { key: string; node: React.ReactNode } => {
    const section = byType.get(sections[sIdx].type)!
    const loading = sIdx === activeIdx && !picker.shown
    if (loading) return { key: `${section.type}-loading`, node: <div className="mm-band-blank"><span className="mm-band-blank-hint">Generating layouts…</span></div> }
    return {
      key: `${section.type}-${section.spec.archetype}-${JSON.stringify(section.spec.params)}`,
      node: <GeneratedSection section={section} style={site.style.resolved} content={contentFor(section.type)} />,
    }
  }

  // Sections waiting for content don't go live yet, so they never hold up finishing.
  const settled = (i: number) => isConfirmed(sections[i].type) || isWaiting(sections[i].type) || !present(sections[i].type)
  const nextIdx = activeIdx < sections.length - 1 ? activeIdx + 1 : Math.max(0, sections.findIndex((_, i) => i !== activeIdx && !settled(i)))
  const needs = isWaiting(activeType) ? SECTION_NEEDS[activeType] ?? 'Add content to show this.' : undefined
  const layout: LayoutState = present(activeType)
    ? { index: picker.index, count: picker.count, label: picker.label, loading: picker.loading, needs }
    : { index: 0, count: 0, label: '', loading: false, needs }
  const navProps: SectionNavProps = {
    site,
    trade,
    sections,
    activeIdx,
    layout,
    allDone: sections.every((_, i) => i === activeIdx || settled(i)),
    nextIdx,
    onCycleLayout: picker.cycle,
    onNewOptions: present(activeType) ? picker.reroll : undefined,
    onNext: () => navigateTo(nextIdx),
    onFinish: finish,
    onContentChange,
    onBusinessChange,
    onChangeLook,
  }

  /** Done: the fields close and the next section opens on its bar (or on to go live). */
  const doneEditing = () => {
    if (busy) return
    refocusEdit.current = true
    dispatchFlow({ type: 'close' })
    if (navProps.allDone) finish()
    else navigateTo(nextIdx)
  }

  const openUpload = (slot: PhotoSlotId, sIdx: number) => {
    if (sIdx !== activeIdx) navigateTo(sIdx)
    uploadFor.current = slot
    uploadRef.current?.click()
  }
  const onUploadFile = async (file: File | undefined) => {
    const slot = uploadFor.current
    const url = await upload.pick(file)
    if (!url || !slot) return
    const now = latestSite.current
    const photos = now.content.photos
    const alt = defaultAlt(slot, now, trade, slot === 'gallery' ? photos.gallery.length : 0)
    onContentChange({ photos: slot === 'gallery' ? { ...photos, gallery: [...photos.gallery, { url, alt }] } : { ...photos, [slot]: { url, alt } } })
  }
  /** A click on a band: its sample tag opens the upload; anywhere else opens the section. */
  const onBandClick = (e: React.MouseEvent, sIdx: number) => {
    const tag = (e.target as Element).closest?.('.mm-sample-tag')
    const slot = tag?.getAttribute('data-slot') as PhotoSlotId | null | undefined
    if (slot) {
      e.stopPropagation()
      openUpload(slot, sIdx)
      return
    }
    if (sIdx !== activeIdx) navigateTo(sIdx)
  }

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = editing ? null : e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) >= 50) picker.cycle(delta < 0 ? 1 : -1)
  }

  if (sections.length === 0) return null

  return (
    <div
      className={`mm-stack-layout${isNarrowDevice ? ' narrow-device' : ''}${editing ? ' phone-edit' : ''}`}
      style={editing ? { '--vv-top': `${viewport.top}px`, '--vvh': `${viewport.height}px`, '--pv-h': `${previewHeight(viewport.height)}px` } as CSSProperties : undefined}
    >
      <section aria-label="Preview of your site" className="mm-stack-view" ref={stackScrollRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div
          className="mm-zoom-outer"
          style={!effectiveMobile && innerH > 0 ? { height: Math.ceil(innerH * zoom) } as CSSProperties : undefined}
        >
          <div
            className="mm-zoom-inner"
            ref={zoomInnerRef}
            style={!effectiveMobile ? { width: DESK_W, transform: `scale(${zoom})`, transformOrigin: 'top left', '--zoom': zoom } as CSSProperties : undefined}
          >
            <div className="mm-stack-site">
              {sections.map((sec, i) => {
                const isActive = i === activeIdx
                const state = isActive ? 'active' : isConfirmed(sec.type) ? 'done' : 'todo'
                const label = SECTION_LABELS[sec.type]
                const waiting = isWaiting(sec.type)
                const needsLine = SECTION_NEEDS[sec.type] ?? 'Add content to show this.'
                return (
                  <div
                    key={sec.type}
                    className={`mm-band ${state}${showPlaceholder(i) ? ' blank' : ''}${editing && !isActive ? ' phone-off' : ''}`}
                    ref={el => { bandRefs.current[i] = el }}
                    onClick={e => onBandClick(e, i)}
                    role={isActive ? undefined : 'button'}
                    tabIndex={isActive ? undefined : 0}
                    onKeyDown={isActive ? undefined : e => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateTo(i) }
                    }}
                    aria-label={isActive ? undefined : `Edit ${label} section`}
                  >
                    {/* Phones: no pills over the site; the section's name is in the bar. */}
                    {!isNarrowDevice && (
                      <div className="mm-band-tag">
                        {state === 'done' && <><Icon.Check size={10} /> </>}
                        {isActive ? `${label} · editing` : label}
                      </div>
                    )}
                    {/* Unvisited sections, those waiting for content too, stay blank until opened: nothing looks chosen in advance. */}
                    {showPlaceholder(i) ? (
                      <div className="mm-band-blank">
                        <span className="mm-band-blank-name">{label}</span>
                        <span className="mm-band-blank-hint">
                          {isActive && waiting ? needsLine : 'tap to build this section'}
                        </span>
                      </div>
                    ) : (() => {
                      const { key, node } = renderBand(i)
                      return (
                        <div className="mm-vanim" key={key}>
                          {waiting && (
                            <p className="mm-example-label mm-example-label--picked">
                              <b>Example content</b> · {needsLine.replace(/ to show this\.$/, '')} to put this on your site. Your layout is kept for it.
                            </p>
                          )}
                          <div style={{ pointerEvents: 'none' }}>
                            <SampleTagged slots={samples} interactive={isActive}>{node}</SampleTagged>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {isNarrowDevice ? (
        <div ref={barRef} className="bd-phone">
          {editing ? (
            <PhoneEditor
              {...navProps}
              size={flow.size}
              onSize={size => dispatchFlow({ type: 'size', size })}
              onDone={doneEditing}
              onClose={() => { refocusEdit.current = true; dispatchFlow({ type: 'close' }) }}
              onFieldFocus={reveal}
              resume={resume}
            />
          ) : (
            <PhoneBar ref={editRef} {...navProps} onEdit={() => { watched.current = null; dispatchFlow({ type: 'edit' }) }} />
          )}
        </div>
      ) : <ControlRail {...navProps} />}
      <input
        ref={uploadRef}
        type="file"
        className="sb-sr-only"
        tabIndex={-1}
        aria-hidden="true"
        accept="image/jpeg,image/png,image/webp,image/heic,image/avif"
        onChange={e => {
          const file = e.target.files?.[0]
          e.target.value = ''
          void onUploadFile(file)
        }}
      />
      <p className="sb-sr-only" role="status" aria-live="polite">
        {upload.state.status === 'working' ? 'Preparing your photo…' : upload.state.status === 'error' ? upload.state.message : ''}
      </p>
    </div>
  )
}
