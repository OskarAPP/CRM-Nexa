import { Navigate, Route, Routes } from 'react-router-dom'
import Mensajes from './mensajes/mensajes'
import Contacts from './contacts/Contacts'
import Login from './login/Login'
import HomeDashboard from './Inicio/HomeDashboard'
import { RequireAuth } from './auth/RequireAuth'
import { RedirectIfAuthenticated } from './auth/RedirectIfAuthenticated'

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={(
          <RedirectIfAuthenticated to="/home-dashboard">
            <Navigate to="/login" replace />
          </RedirectIfAuthenticated>
        )}
      />
      <Route
        path="/mensajes"
        element={(
          <RequireAuth>
            <Mensajes />
          </RequireAuth>
        )}
      />
      <Route
        path="/contactos"
        element={(
          <RequireAuth>
            <Contacts />
          </RequireAuth>
        )}
      />
      <Route path="/login" element={<Login />} />
      <Route
        path="/home-dashboard"
        element={(
          <RequireAuth>
            <HomeDashboard />
          </RequireAuth>
        )}
      />
      <Route
        path="*"
        element={(
          <RedirectIfAuthenticated to="/home-dashboard">
            <Navigate to="/login" replace />
          </RedirectIfAuthenticated>
        )}
      />
    </Routes>
  )
}

export default App
