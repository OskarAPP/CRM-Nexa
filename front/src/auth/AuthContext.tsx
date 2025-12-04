import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { API_BASE } from '../config/api'

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

export type AuthenticatedUser = Record<string, unknown> | null

export type AuthContextValue = {
  status: AuthStatus
  user: AuthenticatedUser
  refresh: () => Promise<void>
  markAuthenticated: (user: AuthenticatedUser) => void
  markLoggedOut: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function fetchSession(): Promise<AuthenticatedUser> {
  const response = await fetch(`${API_BASE}/api/me`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Estado ${response.status}`)
  }

  return (await response.json()) as AuthenticatedUser
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [user, setUser] = useState<AuthenticatedUser>(null)

  const markAuthenticated = useCallback((nextUser: AuthenticatedUser) => {
    setUser(nextUser ?? null)
    setStatus('authenticated')
  }, [])

  const markLoggedOut = useCallback(() => {
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  const refresh = useCallback(async () => {
    setStatus('checking')
    try {
      const nextUser = await fetchSession()
      setUser(nextUser ?? null)
      setStatus('authenticated')
    } catch (error) {
      console.warn('No se pudo verificar la sesión activa', error)
      setUser(null)
      setStatus('unauthenticated')
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, refresh, markAuthenticated, markLoggedOut }),
    [status, user, refresh, markAuthenticated, markLoggedOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext debe usarse dentro de AuthProvider')
  }
  return context
}
