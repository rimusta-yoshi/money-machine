import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import '../brand/tokens.css'
import './home.css'
import { HomePage } from './HomePage'
import { BUILDER_URL } from './content'

// Resume links made before the homepage existed point at the root: send them on to the builder.
if (/(^#|&)resume=/.test(window.location.hash)) window.location.replace(`${BUILDER_URL}${window.location.hash}`)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HomePage />
  </StrictMode>,
)
