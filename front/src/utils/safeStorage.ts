const isBrowser = typeof window !== 'undefined'

const getStorage = () => {
  if (!isBrowser) {
    return null
  }

  return {
    session: window.sessionStorage ?? null,
    local: window.localStorage ?? null,
  }
}

export const safeStorage = {
  get(key: string): string | null {
    const stores = getStorage()
    if (!stores) return null

    return stores.session?.getItem(key) ?? stores.local?.getItem(key) ?? null
  },

  set(key: string, value: string): void {
    const stores = getStorage()
    if (!stores) return

    try {
      stores.session?.setItem(key, value)
      stores.local?.removeItem(key)
    } catch (error) {
      console.warn('No se pudo guardar la información en sessionStorage', error)
    }
  },

  remove(key: string): void {
    const stores = getStorage()
    if (!stores) return

    stores.session?.removeItem(key)
    stores.local?.removeItem(key)
  },
}
