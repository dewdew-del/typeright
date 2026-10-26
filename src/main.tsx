import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import App from './App'
import './index.css'
import { useAuth } from './storage/authStore'
import { startProgressSync } from './storage/progressSync'

startProgressSync()
useAuth.getState().init()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
