import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { useApplyTheme } from './lib/theme'
import { CasualPlay, CasualSetup } from './pages/Casual'
import { ComingSoon } from './pages/ComingSoon'
import { Journey } from './pages/Journey'
import { Landing } from './pages/Landing'
import { LessonPage } from './pages/LessonPage'
import { LevelTest } from './pages/LevelTest'
import { Login } from './pages/Login'
import { Modes } from './pages/Modes'
import { Practice } from './pages/Practice'
import { Profile } from './pages/Profile'
import { Settings } from './pages/Settings'

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  {
    element: <AppShell />,
    children: [
      { path: 'play', element: <Modes /> },
      { path: 'journey', element: <Journey /> },
      { path: 'journey/test', element: <LevelTest /> },
      { path: 'journey/:lessonId', element: <LessonPage /> },
      { path: 'friends', element: <ComingSoon title="Play with friends" stage={7} /> },
      { path: 'casual', element: <CasualSetup /> },
      { path: 'casual/play', element: <CasualPlay /> },
      { path: 'practice', element: <Practice /> },
      { path: 'settings', element: <Settings /> },
      { path: 'login', element: <Login /> },
      { path: 'profile', element: <Profile /> },
      { path: '*', element: <ComingSoon title="Page not found" stage={1} /> },
    ],
  },
])

export default function App() {
  useApplyTheme()
  return <RouterProvider router={router} />
}
