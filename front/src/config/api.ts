const normalizeUrl = (url: string) => url.replace(/\/$/, '')

const resolveApiBase = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL?.trim()
  if (envUrl) {
    return normalizeUrl(envUrl)
  }

  const fallbackPort = (import.meta.env.VITE_API_PORT || '8000').trim()

  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname, port } = window.location

    if (import.meta.env.DEV) {
      return normalizeUrl(`${protocol}//${hostname}${fallbackPort ? `:${fallbackPort}` : ''}`)
    }

    const effectivePort = port && port !== '0' ? port : fallbackPort
    return normalizeUrl(`${protocol}//${hostname}${effectivePort ? `:${effectivePort}` : ''}`)
  }

  return normalizeUrl(`http://localhost${fallbackPort ? `:${fallbackPort}` : ''}`)
}

export const API_BASE = resolveApiBase()
export const API_BASE_WITH_SLASH = `${API_BASE}/`
