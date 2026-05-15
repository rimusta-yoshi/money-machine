import { lazy, Suspense } from 'react'
import { siteConfig } from './config/siteConfig'

const SiteRenderer = lazy(() => import('./site/SiteRenderer').then(m => ({ default: m.SiteRenderer })))
const BuilderEntry = lazy(() => import('./builder/BuilderEntry').then(m => ({ default: m.BuilderEntry })))

export default function App() {
  if (siteConfig.mode === 'site') {
    return <Suspense fallback={null}><SiteRenderer /></Suspense>
  }
  return <Suspense fallback={null}><BuilderEntry /></Suspense>
}
