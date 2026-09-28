import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { SectionType, TradeConfig } from '../types'
import { specKey } from '../gen'
import type { Generated, ResolvedSection, SectionKey } from '../gen'
import type { Site, SiteContent } from '../site/schema'
import { siteSections } from '../site/sections'
import { SECTION_LABELS } from '../site/labels'
import { SECTION_NEEDS } from '../site/needs'
import { sitePage } from '../site/page'
import { pageContent } from '../site/pageContent'
import { GeneratedSection } from '../components/sections/GeneratedSection'
import { Icon } from '../components/ui/Icon'
import { ControlRail } from './ControlRail'
import { MobileSheet } from './MobileSheet'
import type { LayoutState, SectionNavProps } from './sectionNav'
import { useSectionPicker } from './useSectionPicker'

interface Props {
  trade: TradeConfig
  site: Site
  mobile: boolean
  /** Section to open on, e.g. when coming back from the go-live step to add something. */
  initialSection?: SectionType
  onPick: (section: SectionKey, value: Generated) => void
  onContentChange: (patch: Partial<SiteContent>) => void
  onDone: () => void
}

const DESK_W = 1200

function useNarrowDevice() {
  const [narrow, setNarrow] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return narrow
}

export function BuilderCanvas({ trade, site, mobile, initialSection, onPick, onContentChange, onDone }: Props) {
  const sections = siteSections(trade, site)
  const [activeIdx, setActiveIdx] = useState(() => Math.max(0, sections.findIndex(s => s.type === initialSection)))
  const [zoom, setZoom] = useState(1)
  const [innerH, setInnerH] = useState(0)
  const isNarrowDevice = useNarrowDevice()
  const bandRefs = useRef<(HTMLDivElement | null)[]>([])
  const stackScrollRef = useRef<HTMLDivElement | null>(null)
  const zoomInnerRef = useRef<HTMLDivElement | null>(null)
  const touchStartX = useRef<number | null>(null)

  const activeType = sections[activeIdx]?.type ?? 'hero'
  const content = useMemo(() => pageContent(site, trade), [site, trade])
  const picker = useSectionPicker(site, content, activeType)
  // The whole page with the option being browsed swapped in: the rhythm re-solves around it.
  const page = useMemo(
    () => sitePage(site, trade, { overrides: picker.shown ? { [activeType]: picker.shown } : {} }),
    [site, trade, activeType, picker.shown],
  )
  const byType = useMemo(() => new Map<SectionKey, ResolvedSection>(page.map(s => [s.type, s])), [page])

  const effectiveMobile = mobile || isNarrowDevice

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
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    const sc = stackScrollRef.current
    if (!sc) return
    const offset = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 22
    sc.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' })
  }, [activeIdx, effectiveMobile, zoom, isNarrowDevice])

  if (sections.length === 0) return null

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
  }
  const finish = () => {
    if (busy) return
    confirmActive()
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
      node: <GeneratedSection section={section} style={site.style.resolved} content={content} />,
    }
  }

  const layout: LayoutState = present(activeType)
    ? { index: picker.index, count: picker.count, label: picker.label, loading: picker.loading }
    : { index: 0, count: 0, label: '', loading: false, needs: SECTION_NEEDS[activeType] }
  const navProps: SectionNavProps = {
    site,
    trade,
    sections,
    activeIdx,
    layout,
    doneCount: sections.filter(s => isConfirmed(s.type)).length,
    allDone: sections.every((s, i) => i === activeIdx || isConfirmed(s.type) || !present(s.type)),
    onCycleLayout: picker.cycle,
    onNewOptions: present(activeType) ? picker.reroll : undefined,
    onNext: () => navigateTo(Math.min(activeIdx + 1, sections.length - 1)),
    onFinish: finish,
    onContentChange,
  }

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) >= 50) picker.cycle(delta < 0 ? 1 : -1)
  }

  return (
    <div className={`mm-stack-layout${isNarrowDevice ? ' narrow-device' : ''}`}>
      <div className="mm-stack-view" ref={stackScrollRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div
          className="mm-zoom-outer"
          style={!effectiveMobile && innerH > 0 ? { height: Math.ceil(innerH * zoom) } as CSSProperties : undefined}
        >
          <div
            className="mm-zoom-inner"
            ref={zoomInnerRef}
            style={!effectiveMobile ? { width: DESK_W, transform: `scale(${zoom})`, transformOrigin: 'top left' } as CSSProperties : undefined}
          >
            <div className="mm-stack-site">
              {sections.map((sec, i) => {
                const isActive = i === activeIdx
                const state = isActive ? 'active' : isConfirmed(sec.type) ? 'done' : 'todo'
                const label = SECTION_LABELS[sec.type]
                const waiting = !present(sec.type)
                return (
                  <div
                    key={sec.type}
                    className={`mm-band ${state}${showPlaceholder(i) ? ' blank' : ''}`}
                    ref={el => { bandRefs.current[i] = el }}
                    onClick={() => !isActive && navigateTo(i)}
                    role={isActive ? undefined : 'button'}
                    tabIndex={isActive ? undefined : 0}
                    onKeyDown={isActive ? undefined : e => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateTo(i) }
                    }}
                    aria-label={isActive ? undefined : `Edit ${label} section`}
                  >
                    <div className="mm-band-tag">
                      {state === 'done' && <><Icon.Check size={10} /> </>}
                      {isActive ? `Editing · ${label}` : label}
                    </div>
                    {showPlaceholder(i) ? (
                      <div className="mm-band-blank">
                        <span className="mm-band-blank-name">{label}</span>
                        <span className="mm-band-blank-hint">
                          {waiting ? SECTION_NEEDS[sec.type] ?? 'Add content to show this section.' : 'tap to build this section'}
                        </span>
                      </div>
                    ) : (() => {
                      const { key, node } = renderBand(i)
                      return (
                        <div className="mm-vanim" key={key}>
                          <div style={{ pointerEvents: 'none' }}>{node}</div>
                        </div>
                      )
                    })()}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <ControlRail {...navProps} deviceLabel={effectiveMobile ? 'Mobile' : 'Desktop'} />
      {isNarrowDevice && <MobileSheet {...navProps} />}
    </div>
  )
}
