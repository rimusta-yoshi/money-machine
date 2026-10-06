import { useState, useEffect, useRef, useReducer, useCallback } from 'react'
import './brand/tokens.css'
import './builder/ui/fields.css'
import './builder/builder.css'
import type { BusinessInfo, SectionType, TradeConfig } from './types'
import { tradeById } from './trades'
import { siteReducer } from './site/reducer'
import type { SiteAction } from './site/reducer'
import type { Site } from './site/schema'
import { BasicsStep } from './builder/basics/BasicsStep'
import { LookStep } from './builder/look/LookStep'
import { BuilderCanvas } from './builder/BuilderCanvas'
import { TopBar } from './builder/shell/TopBar'
import { FinishStep } from './builder/finish/FinishStep'
import { useFitRepair } from './builder/useFitRepair'
import { usePreviewContent } from './builder/usePreviewContent'
import { FitNotice } from './builder/FitNotice'
import { verifySite } from './builder/verifySite'
import { tradeFromSearch } from './builder/steps'
import type { Step } from './builder/steps'
import { useNarrow } from './builder/useNarrow'
import { randomSeed } from './gen'
import type { Generated, SectionKey } from './gen'
import { apiBase, createApi, siteDomain } from './api/client'
import { useDraft } from './api/useDraft'
import { BRAND } from './brand/config'
import { SaveStatusChip } from './builder/save/SaveStatusChip'
import { ShareCard } from './builder/save/ShareCard'

/** The server, when this build has one (VITE_API_URL). Without it nothing is saved, as before. */
const API_BASE = apiBase()
const api = API_BASE ? createApi(API_BASE) : null
/** Publishing needs the admin key until payment exists (Phase 2): shown on dev builds, or with VITE_ADMIN_PUBLISH. */
const ADMIN_PUBLISH = !!api && (import.meta.env.DEV || import.meta.env.VITE_ADMIN_PUBLISH === 'true')
const DOMAIN = API_BASE ? siteDomain(API_BASE) : BRAND.domain

export default function App() {
  const [step, setStep] = useState<Step>('basics')
  const [site, dispatch] = useReducer(siteReducer, null, () => {
    // A trade picked on the homepage (/build/?trade=plumber) starts the site with it.
    const id = typeof window !== 'undefined' ? tradeFromSearch(window.location.search) : null
    return id ? siteReducer(null, { type: 'pickTrade', trade: tradeById[id] }) : null
  })
  const [mobile, setMobile] = useState(false)
  const [sheetFolded, setSheetFolded] = useState(false)
  const [focusSection, setFocusSection] = useState<SectionType | undefined>(undefined)
  const narrow = useNarrow()
  const trade = site ? tradeById[site.tradeId] : null
  const repair = useCallback((section: SectionKey, value: Generated) => dispatch({ type: 'repairSection', section, value }), [])
  const editing = step === 'build' || step === 'finish'
  // Dev-only preview switch: sample content for seeing a theme's full range. Stripped from production builds.
  const [sample, setSample] = useState(false)
  const preview = usePreviewContent(step === 'build' || step === 'look' ? site : null, trade, import.meta.env.DEV && sample)
  const fit = useFitRepair(editing ? site : null, trade, repair, step === 'build' ? preview : null)
  const dismissFit = fit.dismiss
  const onLoaded = useCallback((saved: Site) => { dispatch({ type: 'load', site: saved }); setStep('build') }, [])
  const onUploaded = useCallback((urls: Record<string, string>) => dispatch({ type: 'replacePhotoUrls', urls }), [])
  const draft = useDraft({ api, site, autosave: editing, onLoaded, onUploaded })

  // Before the go-live step and before publishing, every section is measured on real screens.
  const [verifying, setVerifying] = useState(false)
  const siteRef = useRef(site)
  useEffect(() => { siteRef.current = site }, [site])
  /** Resolves to the checked record (before React has re-rendered with it), or null if checking failed. */
  const verify = useCallback(async (): Promise<Site | null> => {
    const current = siteRef.current
    if (!current) return null
    setVerifying(true)
    try {
      let checked: Site = current
      for (const v of await verifySite(current, tradeById[current.tradeId])) {
        const action: SiteAction = v.status === 'chosen' ? { type: 'pickSection', section: v.type, value: v.entry } : { type: 'repairSection', section: v.type, value: v.entry }
        dispatch(action)
        checked = siteReducer(checked, action) ?? checked
      }
      return checked
    } catch (err) {
      console.error('Checking the site failed', err)
      return null
    } finally {
      setVerifying(false)
    }
  }, [])

  // Each step starts at the top.
  useEffect(() => { window.scrollTo({ top: 0 }) }, [step])

  const go = (next: Step) => {
    setSheetFolded(false)
    setStep(next)
  }
  const reset = () => {
    draft.forget()
    dispatch({ type: 'reset' })
    setFocusSection(undefined)
    go('basics')
  }
  const onBusinessChange = (patch: Partial<BusinessInfo>) => dispatch({ type: 'setBusiness', patch })
  const pickTrade = (t: TradeConfig, business: Partial<BusinessInfo>) => {
    dispatch({ type: 'pickTrade', trade: t })
    if (Object.values(business).some(v => v)) dispatch({ type: 'setBusiness', patch: business })
  }

  const status = draft.enabled ? <SaveStatusChip status={draft.status} onRetry={draft.retry} /> : null
  if (step === 'basics' || !site || !trade) {
    return (
      <BasicsStep
        // A saved draft that failed to reopen is said here, with Retry, before anything new is typed.
        status={draft.status.state === 'error' ? status : null}
        trade={trade}
        site={site}
        onPickTrade={pickTrade}
        onBusinessChange={onBusinessChange}
        onNext={() => go('look')}
      />
    )
  }

  const buildRight = narrow
    ? <button type="button" className="bt-fold" aria-pressed={sheetFolded} onClick={() => setSheetFolded(f => !f)}>Preview</button>
    : (
      <div role="group" aria-label="Preview size" className="bt-size">
        <button type="button" aria-pressed={!mobile} onClick={() => setMobile(false)}>Desktop</button>
        <button type="button" aria-pressed={mobile} onClick={() => setMobile(true)}>Phone</button>
      </div>
    )

  return (
    <div className={`bt-root sb-ui bt-root--${step}`}>
      <TopBar step={step} onGoStep={go} right={<>{status}{step === 'build' && buildRight}</>} />

      {step === 'look' && preview && (
        <LookStep
          site={site}
          trade={trade}
          content={preview}
          onBrandColor={color => dispatch({ type: 'setBrandColor', color })}
          onTheme={theme => dispatch({ type: 'setTheme', theme })}
          onShuffle={() => dispatch({ type: 'rerollStyle', seed: randomSeed() })}
          onToggleReviews={() => dispatch({ type: 'toggleExtra', extra: 'reviews' })}
          onBack={() => go('basics')}
          onNext={() => go('build')}
          sample={import.meta.env.DEV ? { on: sample, set: setSample } : undefined}
        />
      )}

      {step === 'build' && (
        <main className={`bt-build${mobile && !narrow ? ' prev-mobile' : ''}${sheetFolded ? ' sheet-folded' : ''}`}>
          <BuilderCanvas
            key={focusSection ?? 'start'}
            trade={trade}
            site={site}
            content={preview ?? undefined}
            mobile={mobile}
            initialSection={focusSection}
            onPick={(section, value) => dispatch({ type: 'pickSection', section, value })}
            onContentChange={patch => dispatch({ type: 'setContent', patch })}
            onBusinessChange={onBusinessChange}
            onDone={() => { void verify().then(checked => checked && go('finish')) }}
            onChangeLook={() => go('look')}
            sheetFolded={sheetFolded}
          />
        </main>
      )}

      {step === 'finish' && (
        <FinishStep
          trade={trade}
          site={site}
          onBusinessChange={onBusinessChange}
          onEditSection={section => { setFocusSection(section); go('build') }}
          onEditStep={go}
          draft={draft.enabled ? draft : null}
          adminPublish={ADMIN_PUBLISH}
          domain={DOMAIN}
          verify={verify}
          onReset={reset}
          share={draft.enabled ? <ShareCard draft={draft} /> : null}
        />
      )}

      <FitNotice notice={editing ? fit.notice : null} onDismiss={dismissFit} />
      {verifying && (
        <div className="mm-verify" role="status" aria-live="polite">
          <span className="mm-verify-spin" aria-hidden="true" /> Checking every section on a phone and a desktop screen…
        </div>
      )}
    </div>
  )
}
