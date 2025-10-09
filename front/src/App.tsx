import { Navigate, Route, Routes } from 'react-router-dom'
import Inicio from './Inicio'
import Mensajes from './mensajes/mensajes'
import Contacts from './contacts/Contacts'
import Login from './login/Login'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/inicio" replace />} />
      <Route path="/inicio" element={<Inicio />} />
      <Route path="/mensajes" element={<Mensajes />} />
      <Route path="/contactos" element={<Contacts />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  )
}

export default App
