import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import '../brand/tokens.css'
import './home.css'
import { HomePage } from './HomePage'
import { BUILDER_URL, VISIT_SOURCE } from './content'
import { apiBase } from '../api/client'
import { createTracker } from '../analytics/track'

// Resume links made before the homepage existed point at the root: send them on to the builder.
if (/(^#|&)resume=/.test(window.location.hash)) window.location.replace(`${BUILDER_URL}${window.location.hash}`)
// Counted for the admin dashboard: anonymous, no cookies, nothing kept in the browser.
else createTracker(apiBase(), VISIT_SOURCE).step('landed')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HomePage />
  </StrictMode>,
)
