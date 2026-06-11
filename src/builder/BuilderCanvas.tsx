import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import type { CSSProperties } from 'react'
import type { BusinessInfo, SectionType, TradeConfig } from '../types'
import { SectionRenderer } from '../components/sections/SectionRenderer'
import { Icon } from '../components/ui/Icon'

interface Props {
  trade: TradeConfig
  business: BusinessInfo
  mobile: boolean
  onDone: () => void
}

const DESK_W = 1200

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero',
  trust_bar: 'Trust Bar',
  services: 'Services',
  about: 'About',
  why_us: 'Why Us',
  gallery: 'Gallery',
  certifications: 'Certifications',
  testimonials: 'Reviews',
  areas: 'Service Areas',
  contact: 'Contact',
}

function defaultSelections(trade: TradeConfig): Record<SectionType, string> {
  return Object.fromEntries(
    trade.sections.map(s => [s.type, ''])
  ) as Record<SectionType, string>
}

export function BuilderCanvas({ trade, business, mobile, onDone }: Props) {
  const sections = trade.sections
  const [selections, setSelections] = useState(() => defaultSelections(trade))
  const [previewIdx, setPreviewIdx] = useState<Record<string, number>>({})
  const [activeIdx, setActiveIdx] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [innerH, setInnerH] = useState(0)
  const [isNarrowDevice, setIsNarrowDevice] = useState(() => window.innerWidth < 768)
  const bandRefs = useRef<(HTMLDivElement | null)[]>([])
  const stackScrollRef = useRef<HTMLDivElement | null>(null)
  const zoomInnerRef = useRef<HTMLDivElement | null>(null)
  const touchStartX = useRef<number | null>(null)

  const effectiveMobile = mobile || isNarrowDevice

  useEffect(() => {
    const onResize = () => setIsNarrowDevice(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useLayoutEffect(() => {
    if (effectiveMobile) return
    const inner = zoomInnerRef.current
    if (!inner) return
    const outer = inner.parentElement
    if (!outer) return
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
  }, [effectiveMobile, activeIdx, selections, previewIdx])

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

  const getPreviewIdx = (type: SectionType) => previewIdx[type] ?? 0
  const isConfirmed = (type: SectionType) => !!selections[type]

  // Auto-confirm active section then jump to newIdx
  const navigateTo = (newIdx: number) => {
    if (newIdx === activeIdx) return
    const sec = sections[activeIdx]
    const variant = sec.variants[getPreviewIdx(sec.type)] ?? sec.variants[0]
    setSelections(prev => ({ ...prev, [sec.type]: variant.id }))
    setActiveIdx(newIdx)
  }

  const cycle = (type: SectionType, count: number, dir: 1 | -1) => {
    setPreviewIdx(p => ({ ...p, [type]: ((p[type] ?? 0) + dir + count) % count }))
  }

  // Auto-confirm current section then call onDone
  const handleDone = () => {
    const sec = sections[activeIdx]
    const variant = sec.variants[getPreviewIdx(sec.type)] ?? sec.variants[0]
    setSelections(prev => ({ ...prev, [sec.type]: variant.id }))
    onDone()
  }

  const resolveVariant = (sIdx: number) => {
    const sec = sections[sIdx]
    if (selections[sec.type]) {
      return sec.variants.find(v => v.id === selections[sec.type]) ?? sec.variants[0]
    }
    return sec.variants[getPreviewIdx(sec.type)] ?? sec.variants[0]
  }

  // Sections that haven't been visited yet show a blank placeholder
  const showPlaceholder = (sIdx: number) =>
    sIdx !== activeIdx && !selections[sections[sIdx].type]

  const doneCount = sections.filter(s => isConfirmed(s.type)).length
  // All done: every section is either the current active one (confirms on launch click) or already saved
  const allDone = sections.every((s, i) => i === activeIdx || !!selections[s.type])

  const activeSec = sections[activeIdx]
  const activePrevIdx = getPreviewIdx(activeSec.type)
  const activeVariant = activeSec.variants[activePrevIdx]
  const nextIdx = Math.min(activeIdx + 1, sections.length - 1)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 50) return
    cycle(activeSec.type, activeSec.variants.length, delta < 0 ? 1 : -1)
  }

  return (
    <div className={`mm-stack-layout${isNarrowDevice ? ' narrow-device' : ''}`}>

      {/* ---- Assembled site canvas ---- */}
      <div
        className="mm-stack-view"
        ref={stackScrollRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
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
                const state = i === activeIdx ? 'active' : isConfirmed(sec.type) ? 'done' : 'todo'
                const label = SECTION_LABELS[sec.type] ?? sec.type
                const isActive = i === activeIdx
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
                      {state === 'done' && <Icon.Check size={10} />}
                      {state === 'done' && ' '}
                      {state === 'active' ? `Choosing · ${label}` : label}
                    </div>
                    {showPlaceholder(i) ? (
                      <div className="mm-band-blank">
                        <span className="mm-band-blank-name">{label}</span>
                        <span className="mm-band-blank-hint">tap to choose layout</span>
                      </div>
                    ) : (
                      <div className="mm-vanim" key={`${sec.type}-${resolveVariant(i).id}`}>
                        <div style={{ pointerEvents: 'none' }}>
                          <SectionRenderer componentName={resolveVariant(i).component} business={business} trade={trade} />
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

      {/* ---- Desktop control rail (hidden on narrow devices) ---- */}
      <div className="mm-stack-ctrl">
        <div className="sc-prog">
          <div className="sc-prog-top">
            <b>{doneCount}/{sections.length} sections set</b>
            <span>{allDone ? 'Ready to publish' : `Next: ${SECTION_LABELS[sections[nextIdx].type]}`}</span>
          </div>
          <div className="sc-track">
            <div
              className={`sc-fill${allDone ? ' full' : ''}`}
              style={{ width: `${(doneCount / sections.length) * 100}%` } as CSSProperties}
            />
          </div>
        </div>

        <div className="sc-now">
          <div className="sc-now-top">
            <div className="sc-eyebrow">{isConfirmed(activeSec.type) ? 'REVISITING' : 'NOW CHOOSING'}</div>
            <span className="sc-device">
              {effectiveMobile
                ? <><Icon.Phone size={11} /> Mobile</>
                : <><Icon.Monitor size={11} /> Desktop</>
              }
            </span>
          </div>
          <div className="sc-name">{SECTION_LABELS[activeSec.type]}</div>
          <div className="sc-arrows">
            <button
              type="button"
              className="mm-arrow"
              onClick={() => cycle(activeSec.type, activeSec.variants.length, -1)}
              aria-label="Previous layout"
            >
              ‹
            </button>
            <div className="sc-vmeta">
              <div className="sc-vname">{activeVariant.label}</div>
              <div className="mm-dots">
                {activeSec.variants.map((_, i) => (
                  <span key={i} className={i === activePrevIdx ? 'on' : ''} />
                ))}
              </div>
            </div>
            <button
              type="button"
              className="mm-arrow"
              onClick={() => cycle(activeSec.type, activeSec.variants.length, 1)}
              aria-label="Next layout"
            >
              ›
            </button>
          </div>
          <div className="sc-tip">
            Layout {activePrevIdx + 1} of {activeSec.variants.length}
          </div>
        </div>

        {allDone ? (
          <button type="button" className="sc-launch" onClick={handleDone}>
            <Icon.Arrow size={16} /> Get this site live
          </button>
        ) : (
          <button type="button" className="sc-next" onClick={() => navigateTo(nextIdx)}>
            Next · {SECTION_LABELS[sections[nextIdx].type]} <Icon.Arrow size={14} />
          </button>
        )}
        <div className="sc-hint">Tap any section in the preview to jump to it.</div>
      </div>

      {/* ---- Mobile sticky bottom bar (narrow devices only) ---- */}
      {isNarrowDevice && (
        <div className="mm-ctrl-bar">
          <div className="mm-ctrl-bar-top">
            <div className="mm-ctrl-prog-track">
              <div
                className="mm-ctrl-prog-fill"
                style={{ width: `${(doneCount / sections.length) * 100}%` } as CSSProperties}
              />
            </div>
            <span className="mm-ctrl-prog-label">{doneCount}/{sections.length}</span>
          </div>
          <div className="mm-ctrl-bar-mid">
            <button
              type="button"
              className="mm-ctrl-arr"
              onClick={() => cycle(activeSec.type, activeSec.variants.length, -1)}
              aria-label="Previous layout"
            >‹</button>
            <div className="mm-ctrl-center">
              <div className="mm-ctrl-section-name">{SECTION_LABELS[activeSec.type]}</div>
              <div className="mm-dots">
                {activeSec.variants.map((_, i) => (
                  <span key={i} className={i === activePrevIdx ? 'on' : ''} />
                ))}
              </div>
            </div>
            <button
              type="button"
              className="mm-ctrl-arr"
              onClick={() => cycle(activeSec.type, activeSec.variants.length, 1)}
              aria-label="Next layout"
            >›</button>
          </div>
          {allDone ? (
            <button type="button" className="mm-ctrl-launch" onClick={handleDone}>
              <Icon.Arrow size={16} /> Get this site live
            </button>
          ) : (
            <button type="button" className="mm-ctrl-next" onClick={() => navigateTo(nextIdx)}>
              Next · {SECTION_LABELS[sections[nextIdx].type]} <Icon.Arrow size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
