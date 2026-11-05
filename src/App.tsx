import { Navigate, Route, Routes } from 'react-router'
import { useAuth } from './auth/AuthProvider'
import { RequireAuth } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { MyTasksPage } from './pages/MyTasksPage'
import { ObjectPage } from './pages/ObjectPage'
import { ObjectsPage } from './pages/ObjectsPage'
import { TaskPage } from './pages/TaskPage'

function MyTasksRoute() {
  const { profile } = useAuth()
  return profile?.role === 'executor' ? <MyTasksPage /> : <Navigate to="/" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route index element={<ObjectsPage />} />
        <Route path="objects/:id" element={<ObjectPage />} />
        <Route path="tasks/:id" element={<TaskPage />} />
        <Route path="my" element={<MyTasksRoute />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
