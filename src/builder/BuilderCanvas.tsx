import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import type { CSSProperties } from 'react'
import type { SectionType, TradeConfig } from '../types'
import type { Site, SiteContent } from '../site/schema'
import { siteSections } from '../site/sections'
import { SECTION_LABELS } from '../site/labels'
import { SectionRenderer } from '../components/sections/SectionRenderer'
import { Icon } from '../components/ui/Icon'
import { ControlRail } from './ControlRail'
import { MobileSheet } from './MobileSheet'
import type { SectionNavProps } from './sectionNav'

interface Props {
  trade: TradeConfig
  site: Site
  mobile: boolean
  /** Section to open on, e.g. when coming back from the go-live step to add something. */
  initialSection?: SectionType
  onSelect: (section: SectionType, variantId: string) => void
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

export function BuilderCanvas({ trade, site, mobile, initialSection, onSelect, onContentChange, onDone }: Props) {
  const sections = siteSections(trade, site)
  const selections = site.selections
  const [previewIdx, setPreviewIdx] = useState<Record<string, number>>({})
  const [activeIdx, setActiveIdx] = useState(() => Math.max(0, sections.findIndex(s => s.type === initialSection)))
  const [zoom, setZoom] = useState(1)
  const [innerH, setInnerH] = useState(0)
  const isNarrowDevice = useNarrowDevice()
  const bandRefs = useRef<(HTMLDivElement | null)[]>([])
  const stackScrollRef = useRef<HTMLDivElement | null>(null)
  const zoomInnerRef = useRef<HTMLDivElement | null>(null)
  const touchStartX = useRef<number | null>(null)

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
  }, [effectiveMobile, activeIdx, site, previewIdx])

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

  const getPreviewIdx = (type: SectionType) => {
    if (previewIdx[type] !== undefined) return previewIdx[type]
    const sec = sections.find(s => s.type === type)
    return Math.max(0, sec?.variants.findIndex(v => v.id === selections[type]) ?? 0)
  }
  const isConfirmed = (type: SectionType) => !!selections[type]

  /** Saves whatever layout is showing for the active section. */
  const confirmActive = () => {
    const sec = sections[activeIdx]
    const variant = sec.variants[getPreviewIdx(sec.type)] ?? sec.variants[0]
    onSelect(sec.type, variant.id)
  }
  const navigateTo = (newIdx: number) => {
    if (newIdx === activeIdx) return
    confirmActive()
    setActiveIdx(newIdx)
  }
  const cycle = (dir: 1 | -1) => {
    const sec = sections[activeIdx]
    const count = sec.variants.length
    const current = getPreviewIdx(sec.type)
    setPreviewIdx(p => ({ ...p, [sec.type]: (current + dir + count) % count }))
  }
  const finish = () => { confirmActive(); onDone() }

  const resolveVariant = (sIdx: number) => {
    const sec = sections[sIdx]
    if (selections[sec.type]) return sec.variants.find(v => v.id === selections[sec.type]) ?? sec.variants[0]
    return sec.variants[getPreviewIdx(sec.type)] ?? sec.variants[0]
  }
  const showPlaceholder = (sIdx: number) => sIdx !== activeIdx && !selections[sections[sIdx].type]

  const activeSec = sections[activeIdx]
  const navProps: SectionNavProps = {
    site,
    trade,
    sections,
    activeIdx,
    layoutIdx: getPreviewIdx(activeSec.type),
    doneCount: sections.filter(s => isConfirmed(s.type)).length,
    allDone: sections.every((s, i) => i === activeIdx || isConfirmed(s.type)),
    onCycleLayout: cycle,
    onNext: () => navigateTo(Math.min(activeIdx + 1, sections.length - 1)),
    onFinish: finish,
    onContentChange,
  }

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) >= 50) cycle(delta < 0 ? 1 : -1)
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
            <div className="mm-stack-site ff-scope">
              {sections.map((sec, i) => {
                const isActive = i === activeIdx
                const state = isActive ? 'active' : isConfirmed(sec.type) ? 'done' : 'todo'
                const label = SECTION_LABELS[sec.type]
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
                        <span className="mm-band-blank-hint">tap to build this section</span>
                      </div>
                    ) : (
                      <div className="mm-vanim" key={`${sec.type}-${resolveVariant(i).id}`}>
                        <div style={{ pointerEvents: 'none' }}>
                          <SectionRenderer componentName={resolveVariant(i).component} site={site} trade={trade} mode="builder" />
                        </div>
                      </div>
                    )}
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
