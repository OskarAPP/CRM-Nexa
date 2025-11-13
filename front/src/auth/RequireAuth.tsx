import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthContext } from './AuthContext'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuthContext()
  const location = useLocation()

  if (status === 'checking') {
    return <div className="auth-gate">Verificando sesión...</div>
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}
