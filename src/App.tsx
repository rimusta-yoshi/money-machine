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
import { PublishChanges } from './builder/shell/PublishChanges'
import { FinishStep } from './builder/finish/FinishStep'
import { useFitRepair } from './builder/useFitRepair'
import { usePreviewContent } from './builder/usePreviewContent'
import { FitNotice } from './builder/FitNotice'
import { verifySite } from './builder/verifySite'
import { buildDebug, debugInfo, useDebugShortcut } from './builder/debugInfo'
import { basicsGaps, tradeFromSearch } from './builder/steps'
import { isReadyToPublish } from './site/checklist'
import type { Step } from './builder/steps'
import { useNarrow } from './builder/useNarrow'
import { randomSeed } from './gen'
import type { Generated, SectionKey } from './gen'
import { apiBase, createApi, siteDomain } from './api/client'
import { useDraft } from './api/useDraft'
import { useShop } from './api/useShop'
import { takeTesterCodeFromUrl } from './builder/finish/testerCode'
import { BRAND } from './brand/config'
import { SaveStatusChip } from './builder/save/SaveStatusChip'
import { ShareCard } from './builder/save/ShareCard'
import { useScreen } from './builder/account/screens'
import { PaidScreen } from './builder/account/PaidScreen'
import { RefundScreen } from './builder/account/RefundScreen'
import { LostLinkScreen } from './builder/account/LostLinkScreen'
import { AccountShell } from './builder/account/AccountShell'
import { NO_SOURCE, sourceFromSearch } from './analytics/source'
import { createTracker } from './analytics/track'
import { storedDraftKey, editTokenFromHash } from './api/draftKey'
import { loadLocalSite } from './api/localSite'
import { EditLinkChoice } from './builder/account/EditLinkChoice'

/** What a live site needs before changes can be published, or null. */
function publishGap(site: Site | null): string | null {
  if (!site || basicsGaps(site).length) return 'Add your business name and phone number first.'
  return isReadyToPublish(site) ? null : 'Add your email address first: it’s where your receipts and edit links go.'
}

/** The server, when this build has one (VITE_API_URL). Without it nothing is saved, as before. */
const API_BASE = apiBase()
const api = API_BASE ? createApi(API_BASE) : null
/** Publishing without paying, with the admin key (testing and support): dev builds, or with VITE_ADMIN_PUBLISH. */
const ADMIN_PUBLISH = !!api && (import.meta.env.DEV || import.meta.env.VITE_ADMIN_PUBLISH === 'true')
const DOMAIN = API_BASE ? siteDomain(API_BASE) : BRAND.domain
/** The ad this visit came from (carried over from the homepage as ?src=): sent with a new draft and with each step. */
const SOURCE = typeof window === 'undefined' ? NO_SOURCE : sourceFromSearch(window.location.search)
/** Anonymous funnel steps for the admin dashboard (no cookies, nothing kept in the browser). */
const tracker = createTracker(API_BASE, SOURCE)

/**
 * A visit with nothing to reopen: someone starting a new site. Builder steps are counted only on
 * such visits, so a reload, a return visit or an edit link never counts the same person twice
 * (the server counts preview, checkout and payment per site whatever the visit).
 */
const FRESH_VISIT = typeof window !== 'undefined' && !loadLocalSite() && !storedDraftKey() && !editTokenFromHash(window.location.hash)
const trackStep: typeof tracker.step = (step, facts) => { if (FRESH_VISIT) tracker.step(step, facts) }

/** The builder, or one of the pages around paying (Stripe's return page, a refund link, a lost edit link). */
export default function App() {
  // A tester link (/build/?tester=…) is kept for the tab and taken out of the address bar.
  useState(takeTesterCodeFromUrl)
  const screen = useScreen()
  if (screen.kind === 'builder') return <Builder cancelled={screen.cancelled} />
  if (!api) return <AccountShell title="Not switched on"><p>Payments aren’t switched on in this version of the builder.</p></AccountShell>
  if (screen.kind === 'paid') return <PaidScreen api={api} sessionId={screen.sessionId} />
  if (screen.kind === 'refund') return <RefundScreen api={api} token={screen.token} />
  return <LostLinkScreen api={api} />
}

/** Back from Stripe without paying: the go-live step opens again with everything kept. */
function Builder({ cancelled }: { cancelled: boolean }) {
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
  const onLoaded = useCallback((saved: Site) => {
    dispatch({ type: 'load', site: saved })
    setStep(cancelled ? 'finish' : 'build')
    if (cancelled) window.history.replaceState(null, '', window.location.pathname)
  }, [cancelled])
  const onUploaded = useCallback((urls: Record<string, string>) => dispatch({ type: 'replacePhotoUrls', urls }), [])
  const draft = useDraft({ api, site, autosave: editing, onLoaded, onUploaded, source: SOURCE })
  useEffect(() => { trackStep('started', { trade: tradeFromSearch(window.location.search) ?? undefined }) }, [])
  const facts = () => ({ trade: site?.tradeId, theme: site?.style.theme, draftKey: draft.key })
  const shop = useShop(api)

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
        const action: SiteAction = v.status === 'chosen' ? { type: 'acceptSection', section: v.type, value: v.entry } : { type: 'repairSection', section: v.type, value: v.entry }
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

  // Dev builds: Alt+Shift+D copies what's needed to reproduce the current screen.
  const [debugNotice, setDebugNotice] = useState<{ id: number; text: string } | null>(null)
  const getDebug = useCallback(() => (siteRef.current ? debugInfo(siteRef.current, step, buildDebug.current) : null), [step])
  const onDebugCopied = useCallback((ok: boolean) => setDebugNotice(n => ({ id: (n?.id ?? 0) + 1, text: ok ? 'Debug info copied. Paste it into a file and run npm run repro -- <file>.' : 'Couldn’t copy the debug info.' })), [])
  useDebugShortcut(getDebug, onDebugCopied)
  const dismissDebug = useCallback(() => setDebugNotice(null), [])

  // Each step starts at the top.
  useEffect(() => { window.scrollTo({ top: 0 }) }, [step])

  const go = (next: Step) => {
    // Leaving the basics from the top bar still needs a name and a phone number.
    if (step === 'basics' && next !== 'basics' && basicsGaps(site).length) return
    if (step === 'basics' && next !== 'basics') trackStep('basics_done', facts())
    if (step === 'look' && (next === 'build' || next === 'finish')) trackStep('look_picked', facts())
    if (next === 'finish') trackStep('build_done', facts())
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
  // A paid site that's live: edits are published from the top bar on any step.
  const live = draft.enabled && draft.account.paid && !draft.account.refunded && !!draft.published
  const publishChanges = live
    ? <PublishChanges verify={verify} publish={async checked => (await draft.publish(undefined, undefined, checked)).url} missing={() => publishGap(siteRef.current)} />
    : null
  if (draft.conflict) return <EditLinkChoice conflict={draft.conflict} onChoose={draft.resolveConflict} />
  if (step === 'basics' || !site || !trade) {
    return (
      <BasicsStep
        // A saved draft that failed to reopen is said here, with Retry, before anything new is typed.
        // A live site's Publish changes is here too, as on every step.
        status={draft.status.state === 'error' || publishChanges ? <>{draft.status.state === 'error' && status}{publishChanges}</> : null}
        trade={trade}
        site={site}
        onPickTrade={pickTrade}
        onBusinessChange={onBusinessChange}
        onNext={() => go('look')}
        lostLink={!!api}
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
      <TopBar step={step} onGoStep={go} live={live} right={<>{status}{step === 'build' && buildRight}{step !== 'finish' && publishChanges}</>} />

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
          live={live}
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
            onPick={(section, value) => {
              dispatch({ type: 'pickSection', section, value })
              tracker.layout(section, value.spec.archetype, facts())
            }}
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
          cancelled={cancelled}
          shop={shop}
          verify={verify}
          onReset={reset}
          share={draft.enabled ? <ShareCard draft={draft} /> : null}
        />
      )}

      <FitNotice
        notice={draft.notice ?? debugNotice ?? (editing ? fit.notice : null)}
        onDismiss={draft.notice ? draft.dismissNotice : debugNotice ? dismissDebug : dismissFit}
      />
      {verifying && (
        <div className="mm-verify" role="status" aria-live="polite">
          <span className="mm-verify-spin" aria-hidden="true" /> Checking every section on a phone and a desktop screen…
        </div>
      )}
    </div>
  )
}
