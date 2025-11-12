import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import './contacts.css'
import TodosModule, { filterTodos } from './modules/TodosModule'
import ContactosModule, { filterIndividualContacts } from './modules/ContactosModule'
import GruposModule, { filterGroups } from './modules/GruposModule'
import type { ContactsModuleProps } from './modules/ContactModuleBase'
import type { Contact, FilterResponse, FilterTotals, FilterType, LoadingMode } from './types'

function ensureStylesLoaded() {
  const cdnLinks = [
    {
      id: 'fa-contactos',
      href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    },
    {
      id: 'flag-icons',
      href: 'https://cdnjs.cloudflare.com/ajax/libs/flag-icons/6.6.0/css/flag-icons.min.css',
    },
  ]

  for (const { id, href } of cdnLinks) {
    if (!document.getElementById(id)) {
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = href
      document.head.appendChild(link)
    }
  }
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const CSRF_ENDPOINT = `${API_BASE}/sanctum/csrf-cookie`

const getXsrfToken = (): string | null => {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

const jsonAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  const token = getXsrfToken()
  if (token) {
    headers['X-XSRF-TOKEN'] = token
  }

  return headers
}

const ensureCsrfCookie = async (): Promise<void> => {
  try {
    await fetch(CSRF_ENDPOINT, { credentials: 'include' })
  } catch (error) {
    console.warn('No se pudo sincronizar la cookie CSRF', error)
  }
}

const MODULE_COMPONENTS: Record<FilterType, ComponentType<ContactsModuleProps>> = {
  all: TodosModule,
  contact: ContactosModule,
  group: GruposModule,
}

const FILTER_FUNCTIONS: Record<FilterType, (contacts: Contact[]) => Contact[]> = {
  all: filterTodos,
  contact: filterIndividualContacts,
  group: filterGroups,
}

const getStoredUserId = (): string | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null
  const raw = window.localStorage.getItem('user_id')
  if (!raw) return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

function Contacts() {
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all')
  const [activeAreaCodes, setActiveAreaCodes] = useState<string[]>([])
  const [countryCode, setCountryCode] = useState('521')
  const [areaCodesInput, setAreaCodesInput] = useState('')
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMode, setLoadingMode] = useState<LoadingMode>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [rawData, setRawData] = useState('')
  const [showRaw, setShowRaw] = useState(false)
  const [exportSuccessCount, setExportSuccessCount] = useState(0)
  const [filterTotals, setFilterTotals] = useState<FilterTotals | null>(null)
  const [sessionUserId, setSessionUserId] = useState<number | null>(null)

  useEffect(() => {
    ensureStylesLoaded()
  }, [])

  useEffect(() => {
    const stored = getStoredUserId()
    if (!stored) {
      setErrorMessage('No se encontró un user_id en la sesión actual. Inicia sesión para sincronizar tus contactos.')
      return
    }

    const parsed = Number(stored)
    if (!Number.isFinite(parsed)) {
      setErrorMessage('El identificador de usuario almacenado no es válido. Inicia sesión nuevamente.')
      return
    }

    setSessionUserId(parsed)
  }, [])

  useEffect(() => {
    if (exportSuccessCount > 0) {
      const timer = window.setTimeout(() => {
        setExportSuccessCount(0)
      }, 3000)
      return () => window.clearTimeout(timer)
    }
  }, [exportSuccessCount])

  const selectionInfo = useMemo(() => {
    const size = selectedContacts.size
    return {
      count: size,
      show: size > 0,
    }
  }, [selectedContacts])

  const visibleContacts = useMemo(() => FILTER_FUNCTIONS[currentFilter](allContacts), [allContacts, currentFilter])

  const contactsCountLabel = useMemo(() => {
    if (isLoading) return 'Cargando...'
    if (visibleContacts.length > 0) {
      return `${visibleContacts.length} de ${allContacts.length} contactos`
    }
    if (allContacts.length > 0) {
      return `0 de ${allContacts.length} contactos`
    }
    return '0 contactos'
  }, [isLoading, visibleContacts.length, allContacts.length])

  const filterLabel = useMemo(() => {
    if (currentFilter === 'contact') return 'Contactos'
    if (currentFilter === 'group') return 'Grupos'
    return 'Todos'
  }, [currentFilter])

  const syncStatus = isLoading
    ? loadingMode === 'filter'
      ? 'Filtrando…'
      : 'Sincronizando…'
    : 'Listo'

  const activeAreaCodesLabel = activeAreaCodes.length > 0 ? activeAreaCodes.join(', ') : 'Todos'
  const statusIcon = isLoading ? 'fa-circle-notch fa-spin' : 'fa-circle-check'

  const parseAreaCodes = (value: string) => {
    const cleaned = value
      .split(',')
      .map((code) => code.trim())
      .filter((code) => code !== '' && /^\d+$/.test(code))
    return Array.from(new Set(cleaned))
  }

  const syncContacts = useCallback(async () => {
    if (sessionUserId == null) {
      setErrorMessage('No se encontró un identificador de usuario válido para sincronizar los contactos.')
      return
    }

    setIsLoading(true)
    setLoadingMode('sync')
    setErrorMessage(null)
    setFilterTotals(null)

    try {
      await ensureCsrfCookie()

      const response = await fetch(`${API_BASE}/api/find-contacts`, {
        method: 'POST',
        headers: jsonAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({}),
      })

      const raw = await response.text()
      let data: unknown = null

      if (raw) {
        try {
          data = JSON.parse(raw)
        } catch {
          data = raw
        }
      }

      if (!response.ok) {
        const message =
          (typeof data === 'object' && data !== null && 'message' in data
            ? String((data as { message?: unknown }).message ?? '')
            : '') || response.statusText || 'Error al sincronizar contactos'
        throw new Error(message)
      }

      if (Array.isArray(data)) {
        setAllContacts(data as Contact[])
        setSelectedContacts(new Set())
        setRawData(JSON.stringify(data, null, 2))
        return
      }

      if (data && typeof data === 'object' && 'error' in data && (data as { error?: boolean }).error) {
        const message = (data as { message?: string }).message ?? 'Error al sincronizar contactos'
        throw new Error(message)
      }

      const serialized = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
      setAllContacts([])
      setRawData(serialized || '')
    } catch (err: any) {
      setAllContacts([])
      setRawData('')
      setErrorMessage(err?.message || 'No se pudo sincronizar los contactos')
    } finally {
      setIsLoading(false)
      setLoadingMode(null)
    }
  }, [sessionUserId])

  useEffect(() => {
    if (sessionUserId == null) return
    void syncContacts()
  }, [sessionUserId, syncContacts])

  const handleToggleSelection = (jid?: string) => {
    if (!jid) return
    setSelectedContacts((prev) => {
      const next = new Set(prev)
      if (next.has(jid)) {
        next.delete(jid)
      } else {
        next.add(jid)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    setSelectedContacts((prev) => {
      const next = new Set(prev)
  visibleContacts.forEach((contact) => {
        if (contact.remoteJid) {
          next.add(contact.remoteJid)
        }
      })
      return next
    })
  }

  const handleDeselectAll = () => {
    setSelectedContacts(new Set())
  }

  const handleClearFilters = () => {
    setCurrentFilter('all')
    setCountryCode('521')
    setAreaCodesInput('')
    setActiveAreaCodes([])
    setFilterTotals(null)
    setSelectedContacts(new Set())
    setErrorMessage(null)
    if (sessionUserId != null) {
      void syncContacts()
    }
  }

  const handleApplyAdvancedFilters = async () => {
    const cleanCountry = countryCode.trim()
    if (cleanCountry && !/^\d+$/.test(cleanCountry)) {
      alert('El código de país debe contener solo dígitos')
      return
    }

    const codes = parseAreaCodes(areaCodesInput)
    setActiveAreaCodes(codes)
    setAreaCodesInput(codes.join(', '))

    if (sessionUserId == null) {
      setErrorMessage('No se encontró un identificador de usuario válido para aplicar filtros. Inicia sesión nuevamente.')
      return
    }

    setIsLoading(true)
    setLoadingMode('filter')
    setErrorMessage(null)

    try {
      const payload: Record<string, unknown> = {
        country_code: cleanCountry || '521',
      }
      if (codes.length > 0) {
        payload.area_codes = codes
      }
      await ensureCsrfCookie()

      const response = await fetch(`${API_BASE}/api/filter-contacts`, {
        method: 'POST',
        headers: jsonAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const raw = await response.text()
      let data: FilterResponse | null = null

      if (raw) {
        try {
          data = JSON.parse(raw) as FilterResponse
        } catch {
          data = null
        }
      }

      if (!response.ok) {
        const message = data?.message || response.statusText || 'Error al filtrar contactos'
        throw new Error(message)
      }

      if (!data || typeof data !== 'object') {
        throw new Error('Respuesta inesperada del servidor al filtrar contactos')
      }

      if (data.error) {
        throw new Error(data.message || 'Error desconocido al filtrar')
      }

      if (data.matched_contacts && data.matched_contacts.length > 0) {
        setAllContacts(data.matched_contacts)
        setSelectedContacts(new Set())
        setFilterTotals({
          total: data.total_jids_found ?? data.matched_contacts.length,
          filtered: data.filtered_count ?? data.matched_contacts.length,
        })
      } else {
        setAllContacts(data.matched_contacts || [])
        setFilterTotals({
          total: data.total_jids_found ?? 0,
          filtered: data.filtered_count ?? 0,
        })
      }

  setRawData(JSON.stringify(data, null, 2))
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al filtrar')
    } finally {
      setIsLoading(false)
      setLoadingMode(null)
    }
  }

  const handleExportSelected = () => {
    if (selectedContacts.size === 0) return
    const selected = allContacts.filter((contact) => contact.remoteJid && selectedContacts.has(contact.remoteJid))
    if (selected.length === 0) return

    let csvContent = 'Nombre,Número,Tipo\n'
    selected.forEach((contact) => {
      const name = contact.pushName || 'Sin nombre'
      const jid = contact.remoteJid || ''
      const number = jid.split('@')[0] || 'N/A'
      const isGroup = jid.includes('g.us')
      const type = isGroup ? 'Grupo' : 'Contacto'
      const escapedName = `"${name.replace(/"/g, '""')}"`
      csvContent += `${escapedName},${number},${type}\n`
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `contactos_seleccionados_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setExportSuccessCount(selected.length)
  }

  const toggleRawData = () => {
    setShowRaw((prev) => !prev)
  }

  const removeAreaCode = (code: string) => {
    setActiveAreaCodes((prev) => {
      const next = prev.filter((c) => c !== code)
      setAreaCodesInput(next.join(', '))
      return next
    })
  }

  const ModuleComponent = MODULE_COMPONENTS[currentFilter]

  const moduleProps: ContactsModuleProps = {
    type: currentFilter,
    allContacts,
    isLoading,
    loadingMode,
    errorMessage,
    countryCode,
    activeAreaCodes,
    filterTotals,
    selectedContacts,
    onToggleSelection: handleToggleSelection,
  }

  return (
    <div className="contacts-app contacts-layout">
      {exportSuccessCount > 0 && (
        <div className="export-notification">
          <i className="fas fa-check-circle"></i>
          <span>{exportSuccessCount} contactos exportados exitosamente</span>
        </div>
      )}

      <aside className="contacts-sidebar">
        <div className="contacts-sidebar__brand">
          <span className="contacts-chip"><i className="fas fa-address-card"></i> Gestión de contactos</span>
          <h2>Directorio centralizado</h2>
          <p>Sincroniza leads, clasifica segmentos y prepara tus campañas sin salir del panel.</p>
        </div>

        <div className="contacts-sidebar__filters">
          <button
            type="button"
            className={`contacts-nav ${currentFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => setCurrentFilter('all')}
          >
            <span className="contacts-nav__icon"><i className="fas fa-layer-group"></i></span>
            <div>
              <strong>Todos los registros</strong>
              <small>Contactos y grupos</small>
            </div>
          </button>
          <button
            type="button"
            className={`contacts-nav ${currentFilter === 'contact' ? 'is-active' : ''}`}
            onClick={() => setCurrentFilter('contact')}
          >
            <span className="contacts-nav__icon"><i className="fas fa-user"></i></span>
            <div>
              <strong>Solo contactos</strong>
              <small>Perfiles individuales</small>
            </div>
          </button>
          <button
            type="button"
            className={`contacts-nav ${currentFilter === 'group' ? 'is-active' : ''}`}
            onClick={() => setCurrentFilter('group')}
          >
            <span className="contacts-nav__icon"><i className="fas fa-users"></i></span>
            <div>
              <strong>Grupos activos</strong>
              <small>Listas colaborativas</small>
            </div>
          </button>
        </div>

        <div className="contacts-sidebar__card">
          <div className="contacts-sidebar__card-header">
            <h3>Estado de la base</h3>
            <span className={`contacts-status ${isLoading ? 'is-loading' : 'is-ready'}`}>
              <i className={`fas ${statusIcon}`}></i> {syncStatus}
            </span>
          </div>
          <ul className="contacts-sidebar__list">
            <li>
              <span>Total sincronizado</span>
              <strong>{allContacts.length}</strong>
            </li>
            <li>
              <span>Visibles ahora</span>
              <strong>{visibleContacts.length}</strong>
            </li>
            <li>
              <span>Filtro activo</span>
              <strong>{filterLabel}</strong>
            </li>
            <li>
              <span>Códigos de área</span>
              <strong>{activeAreaCodesLabel}</strong>
            </li>
            <li>
              <span>Seleccionados</span>
              <strong>{selectionInfo.count}</strong>
            </li>
          </ul>
        </div>

        <div className="contacts-sidebar__footer">
          <button type="button" className="contacts-link" onClick={() => void syncContacts()}>
            <i className="fas fa-sync"></i> Sincronizar contactos
          </button>
          <button type="button" className="contacts-link" onClick={handleClearFilters}>
            <i className="fas fa-rotate"></i> Restablecer filtros
          </button>
        </div>
      </aside>

      <main className="contacts-main">
        <header className="contacts-hero">
          <div>
            <h1>Gestor de contactos inteligente</h1>
            <p>Organiza audiencias, aplica filtros avanzados y exporta segmentos listos para campañas.</p>
          </div>
          <div className="contacts-hero__meta">
            <span className="contacts-count">{contactsCountLabel}</span>
            {selectionInfo.show && <span className="contacts-selection">{selectionInfo.count} seleccionados</span>}
          </div>
        </header>

        <div className="contacts-hero__actions">
          <button type="button" className="contacts-ghost" onClick={handleClearFilters}>
            <i className="fas fa-broom"></i> Limpiar filtros
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportSelected}
            disabled={selectedContacts.size === 0}
          >
            <i className="fas fa-download"></i> Exportar seleccionados
          </button>
        </div>

        <section className="contacts-card contacts-filters">
          <div className="contacts-card__header">
            <div>
              <h2>Filtros avanzados</h2>
              <p>Define criterios por país y códigos de área para segmentar con precisión.</p>
            </div>
            <button type="button" className="btn btn-primary" onClick={handleApplyAdvancedFilters}>
              <i className="fas fa-filter"></i> Aplicar filtros
            </button>
          </div>
          <div className="contacts-filter-grid">
            <div className="input-group">
              <label htmlFor="countryCode">
                <i className="fas fa-flag"></i> Código de país
              </label>
              <input
                type="text"
                id="countryCode"
                placeholder="Ej: 521 (México)"
                value={countryCode}
                maxLength={5}
                onChange={(event) => setCountryCode(event.target.value)}
              />
              <small>Predeterminado: 521 (México)</small>
            </div>

            <div className="input-group">
              <label htmlFor="areaCodes">
                <i className="fas fa-map-marker-alt"></i> Códigos de área
              </label>
              <input
                type="text"
                id="areaCodes"
                placeholder="Ej: 999,981,996"
                value={areaCodesInput}
                maxLength={50}
                onChange={(event) => setAreaCodesInput(event.target.value)}
              />
              <small>Separe múltiples valores con comas</small>
              {activeAreaCodes.length > 0 && (
                <div className="area-chips" id="areaChipsContainer">
                  {activeAreaCodes.map((code) => (
                    <div className="area-chip" key={code}>
                      {code}
                      <button className="remove-chip" onClick={() => removeAreaCode(code)} type="button">
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="contacts-body">
          <article className="contacts-card contacts-list">
            <div className="contacts-list__header">
              <div>
                <span className="contacts-chip"><i className="fas fa-database"></i> Segmento activo</span>
                <h2>Mis contactos</h2>
                <p className="contacts-list__hint">Selecciona registros individuales o grupos y prepáralos para exportación.</p>
              </div>
              <div className="contacts-list__actions">
                <button type="button" className="contacts-ghost" onClick={handleSelectAll}>
                  <i className="fas fa-check-double"></i> Seleccionar todos
                </button>
                <button type="button" className="contacts-ghost" onClick={handleDeselectAll}>
                  <i className="fas fa-times"></i> Deseleccionar
                </button>
              </div>
            </div>

            {filterTotals && (
              <div className="contacts-list__summary">
                <div>
                  <span>Total encontrados</span>
                  <strong>{filterTotals.total}</strong>
                </div>
                <div>
                  <span>Coincidencias filtradas</span>
                  <strong>{filterTotals.filtered}</strong>
                </div>
              </div>
            )}

            <div className="contacts-grid" id="contacts">
              <ModuleComponent {...moduleProps} />
            </div>
          </article>

          <aside className="contacts-card contacts-raw">
            <div className="contacts-card__header">
              <div>
                <h2>Datos técnicos</h2>
                <p>Consulta la respuesta del servicio para diagnósticos y soporte.</p>
              </div>
              <button type="button" className="contacts-link" onClick={toggleRawData}>
                <i className="fas fa-code"></i> {showRaw ? 'Ocultar JSON' : 'Mostrar JSON'}
              </button>
            </div>
            <div className={`raw-content ${showRaw ? 'show' : ''}`}>
              {showRaw ? <pre>{rawData}</pre> : <p className="raw-placeholder">Activa la vista para inspeccionar el JSON recibido.</p>}
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}

export default Contacts