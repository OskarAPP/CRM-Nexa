import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthContext } from './AuthContext'

type RedirectIfAuthenticatedProps = {
  children: ReactNode
  to?: string
}

export function RedirectIfAuthenticated({ children, to = '/home-dashboard' }: RedirectIfAuthenticatedProps) {
  const { status } = useAuthContext()

  if (status === 'checking') {
    return <div className="auth-gate">Verificando sesión...</div>
  }

  if (status === 'authenticated') {
    return <Navigate to={to} replace />
  }

  return <>{children}</>
}
