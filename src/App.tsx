import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { useApplyTheme } from './lib/theme'
import { ComingSoon } from './pages/ComingSoon'
import { Journey } from './pages/Journey'
import { LessonPage } from './pages/LessonPage'
import { Practice } from './pages/Practice'
import { Landing } from './pages/Landing'
import { Modes } from './pages/Modes'

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  {
    element: <AppShell />,
    children: [
      { path: 'play', element: <Modes /> },
      { path: 'journey', element: <Journey /> },
      { path: 'journey/test', element: <ComingSoon title="Test your skill" stage={4} /> },
      { path: 'journey/:lessonId', element: <LessonPage /> },
      { path: 'friends', element: <ComingSoon title="Play with friends" stage={7} /> },
      { path: 'casual', element: <ComingSoon title="Casual typing" stage={4} /> },
      { path: 'login', element: <ComingSoon title="Login" stage={5} /> },
      { path: 'practice', element: <Practice /> },
      { path: '*', element: <ComingSoon title="Page not found" stage={1} /> },
    ],
  },
])

export default function App() {
  useApplyTheme()
  return <RouterProvider router={router} />
}
