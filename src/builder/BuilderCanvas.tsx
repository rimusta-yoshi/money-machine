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
  const [locking, setLocking] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [innerH, setInnerH] = useState(0)
  const bandRefs = useRef<(HTMLDivElement | null)[]>([])
  const stackScrollRef = useRef<HTMLDivElement | null>(null)
  const zoomInnerRef = useRef<HTMLDivElement | null>(null)

  // Scale 1200px canvas to fit outer width — runs in both desktop and mobile modes.
  // Mobile mode: CSS constrains the outer to 390px, so zoom auto-adjusts to ~0.325.
  useLayoutEffect(() => {
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
  }, [mobile, activeIdx, selections, previewIdx])

  useEffect(() => {
    const el = bandRefs.current[activeIdx]
    if (!el) return
    const sc = stackScrollRef.current
    if (!sc) return
    const offset = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 22
    sc.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' })
  }, [activeIdx, mobile, zoom])

  if (sections.length === 0) return null

  const getPreviewIdx = (type: SectionType) => previewIdx[type] ?? 0
  const isLocked = (type: SectionType) => !!selections[type]

  const cycle = (type: SectionType, count: number, dir: 1 | -1) => {
    setPreviewIdx(p => ({ ...p, [type]: ((p[type] ?? 0) + dir + count) % count }))
  }

  const selectCurrent = () => {
    if (locking) return
    const sec = sections[activeIdx]
    const idx = getPreviewIdx(sec.type)
    const variant = sec.variants[idx]
    const newSel = { ...selections, [sec.type]: variant.id }
    setSelections(newSel)
    setLocking(sec.type)
    setTimeout(() => setLocking(null), 520)
    setTimeout(() => {
      for (let i = activeIdx + 1; i < sections.length; i++) {
        if (!newSel[sections[i].type]) { setActiveIdx(i); return }
      }
      for (let i = 0; i < sections.length; i++) {
        if (!newSel[sections[i].type]) { setActiveIdx(i); return }
      }
    }, 280)
  }

  const resolveVariant = (sIdx: number) => {
    const sec = sections[sIdx]
    if (isLocked(sec.type)) {
      return sec.variants.find(v => v.id === selections[sec.type]) ?? sec.variants[0]
    }
    if (sIdx === activeIdx) return sec.variants[getPreviewIdx(sec.type)] ?? sec.variants[0]
    return sec.variants.find(v => v.id === sec.recommended) ?? sec.variants[0]
  }

  const doneCount = sections.filter(s => isLocked(s.type)).length
  const allDone = doneCount === sections.length

  const activeSec = sections[activeIdx]
  const activePrevIdx = getPreviewIdx(activeSec.type)
  const activeVariant = activeSec.variants[activePrevIdx]
  const locked = isLocked(activeSec.type)
  const nextSec = sections[(activeIdx + 1) % sections.length]

  const useBtn = (
    <button
      type="button"
      className={`mm-select${locked ? ' locked' : ''}${locking === activeSec.type ? ' mm-locking' : ''}`}
      onClick={selectCurrent}
    >
      <Icon.Check size={16} />
      {locked ? 'Selected — next section' : 'Use this layout'}
    </button>
  )

  return (
    <div className="mm-stack-layout">
      {/* ---- Left: assembled site ---- */}
      <div className="mm-stack-view" ref={stackScrollRef}>
        <div
          className="mm-zoom-outer"
          style={innerH > 0 ? { height: Math.ceil(innerH * zoom) } as CSSProperties : undefined}
        >
          <div
            className="mm-zoom-inner"
            ref={zoomInnerRef}
            style={{ width: DESK_W, transform: `scale(${zoom})`, transformOrigin: 'top left' } as CSSProperties}
          >
            <div className="mm-stack-site">
              {sections.map((sec, i) => {
                const state = i === activeIdx ? 'active' : isLocked(sec.type) ? 'done' : 'todo'
                const variant = resolveVariant(i)
                const label = SECTION_LABELS[sec.type] ?? sec.type
                const isActive = i === activeIdx
                return (
                  <div
                    key={sec.type}
                    className={`mm-band ${state}`}
                    ref={el => { bandRefs.current[i] = el }}
                    onClick={() => !isActive && setActiveIdx(i)}
                    role={isActive ? undefined : 'button'}
                    tabIndex={isActive ? undefined : 0}
                    onKeyDown={isActive ? undefined : e => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveIdx(i) }
                    }}
                    aria-label={isActive ? undefined : `Edit ${label} section`}
                  >
                    <div className="mm-band-tag">
                      {state === 'done' && <Icon.Check size={10} />}
                      {state === 'done' && ' '}
                      {state === 'active' ? `Choosing · ${label}` : label}
                    </div>
                    <div className="mm-vanim" key={`${sec.type}-${variant.id}`}>
                      <div style={{ pointerEvents: 'none' }}>
                        <SectionRenderer componentName={variant.component} business={business} trade={trade} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ---- Right: control rail (always desktop, mobile only affects preview width) ---- */}
      <div className="mm-stack-ctrl">
        <div className="sc-prog">
          <div className="sc-prog-top">
            <b>{doneCount}/{sections.length} sections set</b>
            <span>{allDone ? 'Ready to publish' : `Next: ${SECTION_LABELS[nextSec.type]}`}</span>
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
            <div className="sc-eyebrow">{locked ? 'CHOSEN' : 'NOW CHOOSING'}</div>
            <span className="sc-device">
              {mobile
                ? <><Icon.Phone size={11} /> Mobile view</>
                : <><Icon.Monitor size={11} /> Desktop view</>
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
            Layout {activePrevIdx + 1} of {activeSec.variants.length} · swaps into the live site
          </div>
          {useBtn}
        </div>

        {allDone && (
          <button type="button" className="sc-launch" onClick={onDone}>
            <Icon.Arrow size={16} /> Get this site live
          </button>
        )}
        <div className="sc-hint">Tap any band in the site to jump to it.</div>
      </div>
    </div>
  )
}
