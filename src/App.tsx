import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { useApplyTheme } from './lib/theme'
import { CasualPlay, CasualSetup } from './pages/Casual'
import { ComingSoon } from './pages/ComingSoon'
import { CreateRoom, Friends, JoinRoom } from './pages/Friends'
import { GroupDetail, Groups } from './pages/Groups'
import { Journey } from './pages/Journey'
import { Landing } from './pages/Landing'
import { Leaderboard } from './pages/Leaderboard'
import { LessonPage } from './pages/LessonPage'
import { LevelTest } from './pages/LevelTest'
import { Login } from './pages/Login'
import { Modes } from './pages/Modes'
import { Practice } from './pages/Practice'
import { Profile } from './pages/Profile'
import { PublicProfile } from './pages/PublicProfile'
import { RaceRoom } from './pages/RaceRoom'
import { Ranked } from './pages/Ranked'
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
      { path: 'friends', element: <Friends /> },
      { path: 'friends/create', element: <CreateRoom /> },
      { path: 'friends/join', element: <JoinRoom /> },
      { path: 'race/:roomId', element: <RaceRoom /> },
      { path: 'daily', element: <Ranked daily /> },
      { path: 'groups', element: <Groups /> },
      { path: 'groups/:groupId', element: <GroupDetail /> },
      { path: 'casual', element: <CasualSetup /> },
      { path: 'casual/play', element: <CasualPlay /> },
      { path: 'practice', element: <Practice /> },
      { path: 'settings', element: <Settings /> },
      { path: 'login', element: <Login /> },
      { path: 'profile', element: <Profile /> },
      { path: 'leaderboard', element: <Leaderboard /> },
      { path: 'ranked', element: <Ranked /> },
      { path: 'u/:username', element: <PublicProfile /> },
      { path: '*', element: <ComingSoon title="Page not found" stage={1} /> },
    ],
  },
])

export default function App() {
  useApplyTheme()
  return <RouterProvider router={router} />
}
