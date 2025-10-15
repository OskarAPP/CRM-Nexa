import { Navigate, Route, Routes } from 'react-router-dom'
import Inicio from './Inicio'
import Mensajes from './mensajes/mensajes'
import Contacts from './contacts/Contacts'
import Login from './login/Login'
import Dashboard from './Dashboard'
import HomeDashboard from './Inicio/HomeDashboard'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/inicio" replace />} />
      <Route path="/inicio" element={<Inicio />} />
      <Route path="/mensajes" element={<Mensajes />} />
      <Route path="/contactos" element={<Contacts />} />

      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/home-dashboard" element={<HomeDashboard />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
