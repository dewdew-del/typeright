import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import App from './App'
import { reloadOnceForNewVersion } from './components/layout/RouteError'
import './index.css'
import { useAuth } from './storage/authStore'
import { startProgressSync } from './storage/progressSync'

// A deploy replaced a file this tab still points at: reload once to get the new version.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForNewVersion()) event.preventDefault()
})

startProgressSync()
useAuth.getState().init()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
