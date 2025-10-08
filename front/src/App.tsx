import { Navigate, Route, Routes } from 'react-router-dom'
import Inicio from './Inicio'
import Contacts from './contacts/Contacts'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/mensajes" replace />} />
      <Route path="/mensajes" element={<Inicio />} />
      <Route path="/contactos" element={<Contacts />} />
    </Routes>
  )
}

export default App
