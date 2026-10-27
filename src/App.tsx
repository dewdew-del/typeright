import { useEffect } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { usePresence } from './lib/presence'
import { useApplyTheme } from './lib/theme'
import { CasualPlay, CasualSetup } from './pages/Casual'
import { ComingSoon } from './pages/ComingSoon'
import { CreateRoom, Friends, JoinRoom } from './pages/Friends'
import { Journey } from './pages/Journey'
import { Landing } from './pages/Landing'
import { Leaderboard } from './pages/Leaderboard'
import { LessonPage } from './pages/LessonPage'
import { LevelTest } from './pages/LevelTest'
import { Login } from './pages/Login'
import { Modes } from './pages/Modes'
import { Practice } from './pages/Practice'
import { Privacy } from './pages/Privacy'
import { PublicProfile } from './pages/PublicProfile'
import { RaceRoom } from './pages/RaceRoom'
import { useUi } from './stores/settings'

/** Email links (password reset) land on /profile: open the profile panel over the menu. */
function OpenProfile() {
  const open = useUi((s) => s.open)
  useEffect(() => open('profile'), [open])
  return <Navigate to="/play" replace />
}

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  {
    element: <AppShell />,
    children: [
      { path: 'play', element: <Modes /> },
      { path: 'journey', element: <Journey /> },
      { path: 'journey/test', element: <LevelTest /> },
      { path: 'journey/:lessonId', element: <LessonPage /> },
      { path: 'friends', element: <Friends /> },
      { path: 'friends/create', element: <CreateRoom /> },
      { path: 'friends/join', element: <JoinRoom /> },
      { path: 'race/:roomId', element: <RaceRoom /> },
      { path: 'casual', element: <CasualSetup /> },
      { path: 'casual/play', element: <CasualPlay /> },
      { path: 'practice', element: <Practice /> },
      { path: 'login', element: <Login /> },
      { path: 'profile', element: <OpenProfile /> },
      { path: 'leaderboard', element: <Leaderboard /> },
      { path: 'privacy', element: <Privacy /> },
      { path: 'u/:username', element: <PublicProfile /> },
      { path: '*', element: <ComingSoon title="Page not found" stage={1} /> },
    ],
  },
])

export default function App() {
  useApplyTheme()
  usePresence()
  return <RouterProvider router={router} />
}
