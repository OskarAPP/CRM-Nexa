import { Navigate, Route, Routes } from 'react-router-dom'
import Inicio from './Inicio'
import Mensajes from './mensajes/mensajes'
import Contacts from './contacts/Contacts'
import Login from './login/Login'
import Pruebas from './Pruebas'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/inicio" replace />} />
      <Route path="/inicio" element={<Inicio />} />
      <Route path="/mensajes" element={<Mensajes />} />
      <Route path="/contactos" element={<Contacts />} />
    <Route path="/login" element={<Login />} />
    <Route path="/prueba" element={<Navigate to="/pruebas" replace />} />
    <Route path="/pruebas" element={<Pruebas />} />
    </Routes>
  )
}

export default App
