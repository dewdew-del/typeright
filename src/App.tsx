import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { ComingSoon } from './pages/ComingSoon'
import { Home } from './pages/Home'
import { KeyboardDemo } from './pages/KeyboardDemo'
import { Lessons } from './pages/Lessons'

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'lessons', element: <Lessons /> },
      { path: 'keyboard', element: <KeyboardDemo /> },
      { path: 'progress', element: <ComingSoon title="Progress" stage={4} /> },
      { path: 'leaderboard', element: <ComingSoon title="Leaderboard" stage={6} /> },
      { path: 'race', element: <ComingSoon title="Live races" stage={7} /> },
      { path: 'groups', element: <ComingSoon title="Groups" stage={7} /> },
      { path: 'settings', element: <ComingSoon title="Settings" stage={4} /> },
      { path: '*', element: <ComingSoon title="Page not found" stage={1} /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
