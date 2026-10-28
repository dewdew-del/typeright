import { useEffect } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { usePresence } from './lib/presence'
import { useApplyTheme } from './lib/theme'
import { ComingSoon } from './pages/ComingSoon'
import { useUi } from './stores/settings'

/** Email links (password reset) land on /profile: open the profile panel over the menu. */
function OpenProfile() {
  const open = useUi((s) => s.open)
  useEffect(() => open('profile'), [open])
  return <Navigate to="/play" replace />
}

/** Old /leaderboard links open the leaderboard pop-up over the menu. */
function OpenLeaderboard() {
  const open = useUi((s) => s.open)
  useEffect(() => open('leaderboard'), [open])
  return <Navigate to="/play" replace />
}

// Each page is its own file, downloaded when it is first visited, so the first screen loads less code.
const router = createBrowserRouter([
  { path: '/', lazy: async () => ({ Component: (await import('./pages/Landing')).Landing }) },
  {
    element: <AppShell />,
    children: [
      { path: 'play', lazy: async () => ({ Component: (await import('./pages/Modes')).Modes }) },
      { path: 'journey', lazy: async () => ({ Component: (await import('./pages/Journey')).Journey }) },
      { path: 'journey/test', lazy: async () => ({ Component: (await import('./pages/LevelTest')).LevelTest }) },
      { path: 'journey/:lessonId', lazy: async () => ({ Component: (await import('./pages/LessonPage')).LessonPage }) },
      { path: 'friends', lazy: async () => ({ Component: (await import('./pages/Friends')).Friends }) },
      { path: 'friends/create', lazy: async () => ({ Component: (await import('./pages/Friends')).CreateRoom }) },
      { path: 'friends/join', lazy: async () => ({ Component: (await import('./pages/Friends')).JoinRoom }) },
      { path: 'race/:roomId', lazy: async () => ({ Component: (await import('./pages/RaceRoom')).RaceRoom }) },
      { path: 'casual', lazy: async () => ({ Component: (await import('./pages/Casual')).CasualSetup }) },
      { path: 'casual/play', lazy: async () => ({ Component: (await import('./pages/Casual')).CasualPlay }) },
      { path: 'practice', lazy: async () => ({ Component: (await import('./pages/Practice')).Practice }) },
      { path: 'login', lazy: async () => ({ Component: (await import('./pages/Login')).Login }) },
      { path: 'profile', element: <OpenProfile /> },
      { path: 'leaderboard', element: <OpenLeaderboard /> },
      { path: 'privacy', lazy: async () => ({ Component: (await import('./pages/Privacy')).Privacy }) },
      { path: 'admin', lazy: async () => ({ Component: (await import('./pages/Admin')).Admin }) },
      { path: 'u/:username', lazy: async () => ({ Component: (await import('./pages/PublicProfile')).PublicProfile }) },
      { path: '*', element: <ComingSoon title="Page not found" stage={1} /> },
    ],
  },
])

export default function App() {
  useApplyTheme()
  usePresence()
  return <RouterProvider router={router} />
}
