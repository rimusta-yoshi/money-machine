import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import type { CSSProperties } from 'react'
import type { SectionType, TradeConfig } from '../types'
import type { GeneratedHero as StoredHero } from '../gen'
import type { Site, SiteContent } from '../site/schema'
import { siteSections } from '../site/sections'
import { SECTION_LABELS } from '../site/labels'
import { SectionRenderer } from '../components/sections/SectionRenderer'
import { GeneratedHero } from '../components/sections/GeneratedHero'
import { Icon } from '../components/ui/Icon'
import { ControlRail } from './ControlRail'
import { MobileSheet } from './MobileSheet'
import type { LayoutState, SectionNavProps } from './sectionNav'
import { useHeroPicker } from './useHeroPicker'

type TemplateSection = Exclude<SectionType, 'hero'>

interface Props {
  trade: TradeConfig
  site: Site
  mobile: boolean
  /** Section to open on, e.g. when coming back from the go-live step to add something. */
  initialSection?: SectionType
  onSelect: (section: TemplateSection, variantId: string) => void
  onPickHero: (hero: StoredHero) => void
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

export function BuilderCanvas({ trade, site, mobile, initialSection, onSelect, onPickHero, onContentChange, onDone }: Props) {
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
  const hero = useHeroPicker(site, trade)

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
  }, [effectiveMobile, activeIdx, site, previewIdx, hero.shown])

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

  const getPreviewIdx = (type: TemplateSection) => {
    if (previewIdx[type] !== undefined) return previewIdx[type]
    const sec = sections.find(s => s.type === type)
    return Math.max(0, sec?.variants.findIndex(v => v.id === selections[type]) ?? 0)
  }
  const isConfirmed = (type: SectionType) => (type === 'hero' ? !!site.sections.hero : !!selections[type])

  /** Saves whatever layout is showing for the active section. */
  const confirmActive = () => {
    const sec = sections[activeIdx]
    if (sec.type === 'hero') {
      const pick = hero.pick()
      if (pick) onPickHero(pick)
      return
    }
    const variant = sec.variants[getPreviewIdx(sec.type)] ?? sec.variants[0]
    onSelect(sec.type, variant.id)
  }
  // A generated section can't be saved until its options are ready.
  const busy = sections[activeIdx]?.type === 'hero' && hero.loading
  const navigateTo = (newIdx: number) => {
    if (newIdx === activeIdx || busy) return
    confirmActive()
    setActiveIdx(newIdx)
  }
  const cycle = (dir: 1 | -1) => {
    const sec = sections[activeIdx]
    if (sec.type === 'hero') return hero.cycle(dir)
    const count = sec.variants.length
    const current = getPreviewIdx(sec.type)
    setPreviewIdx(p => ({ ...p, [sec.type]: (current + dir + count) % count }))
  }
  const finish = () => {
    if (busy) return
    confirmActive()
    onDone()
  }

  const resolveVariant = (type: TemplateSection) => {
    const sec = sections.find(s => s.type === type)!
    const picked = selections[type]
    if (picked) return sec.variants.find(v => v.id === picked) ?? sec.variants[0]
    return sec.variants[getPreviewIdx(type)] ?? sec.variants[0]
  }
  const showPlaceholder = (sIdx: number) => sIdx !== activeIdx && !isConfirmed(sections[sIdx].type)

  /** The section as it should appear in its band, keyed so a layout change re-animates. */
  const renderSection = (sIdx: number): { key: string; node: React.ReactNode } => {
    const type = sections[sIdx].type
    if (type === 'hero') {
      const spec = sIdx === activeIdx ? hero.shown : site.sections.hero?.spec
      if (!spec) return { key: 'hero-loading', node: <div className="mm-band-blank"><span className="mm-band-blank-hint">Generating layouts…</span></div> }
      return { key: `hero-${JSON.stringify(spec.params)}-${spec.archetype}`, node: <GeneratedHero spec={spec} style={site.style.resolved} content={hero.content} /> }
    }
    const variant = resolveVariant(type)
    return { key: `${type}-${variant.id}`, node: <SectionRenderer componentName={variant.component} site={site} trade={trade} mode="builder" /> }
  }

  const activeSec = sections[activeIdx]
  const layout: LayoutState = activeSec.type === 'hero'
    ? { index: hero.index, count: hero.count, label: hero.label, loading: hero.loading }
    : {
        index: getPreviewIdx(activeSec.type),
        count: activeSec.variants.length,
        label: activeSec.variants[getPreviewIdx(activeSec.type)]?.label ?? '',
        loading: false,
      }
  const navProps: SectionNavProps = {
    site,
    trade,
    sections,
    activeIdx,
    layout,
    doneCount: sections.filter(s => isConfirmed(s.type)).length,
    allDone: sections.every((s, i) => i === activeIdx || isConfirmed(s.type)),
    onCycleLayout: cycle,
    onNewOptions: activeSec.type === 'hero' ? hero.reroll : undefined,
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
                    ) : (() => {
                      const { key, node } = renderSection(i)
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
