import { Navigate, Route, Routes } from 'react-router-dom'
import Inicio from './Inicio'
import Contacts from './contacts/Contacts'
import Login from './login/Login'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/mensajes" replace />} />
      <Route path="/mensajes" element={<Inicio />} />
      <Route path="/contactos" element={<Contacts />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  )
}

export default App
