import { useEffect, useMemo, useState } from 'react'
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

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

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

  useEffect(() => {
    ensureStylesLoaded()
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

  const parseAreaCodes = (value: string) => {
    const cleaned = value
      .split(',')
      .map((code) => code.trim())
      .filter((code) => code !== '' && /^\d+$/.test(code))
    return Array.from(new Set(cleaned))
  }

  const handleFindContacts = async () => {
    setIsLoading(true)
    setLoadingMode('sync')
    setErrorMessage(null)
    setFilterTotals(null)
    try {
      const response = await fetch(`${API_BASE}/api/find-contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data: Contact[] = await response.json()
      if (Array.isArray(data) && data.length > 0) {
        setAllContacts(data)
        setSelectedContacts(new Set())
        setRawData(JSON.stringify(data, null, 2))
      } else {
        setAllContacts([])
        setRawData(JSON.stringify(data, null, 2))
      }
    } catch (err: any) {
      setErrorMessage(`No se pudo conectar con el servidor: ${err?.message || String(err)}`)
    } finally {
      setIsLoading(false)
      setLoadingMode(null)
    }
  }

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
      const response = await fetch(`${API_BASE}/api/filter-contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data: FilterResponse = await response.json()
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
        setRawData(JSON.stringify(data, null, 2))
      } else {
        setAllContacts(data.matched_contacts || [])
        setRawData(JSON.stringify(data, null, 2))
        setFilterTotals({
          total: data.total_jids_found ?? 0,
          filtered: data.filtered_count ?? 0,
        })
      }
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
    <div className="contacts-app">
      {exportSuccessCount > 0 && (
        <div className="export-notification">
          <i className="fas fa-check-circle"></i>
          <span>{exportSuccessCount} contactos exportados exitosamente</span>
        </div>
      )}
      <div className="container">
        <header>
          <div className="logo">
            <i className="fas fa-address-book"></i>
          </div>
          <h1>Business Contacts Manager</h1>
          <p className="subtitle">Acceda y gestione sus contactos profesionales de forma segura y organizada</p>
        </header>

        <div className="actions">
          <button className="btn" onClick={handleFindContacts}>
            <i className="fas fa-sync-alt"></i> Sincronizar Contactos
          </button>
          <button className="btn btn-outline" onClick={handleClearFilters}>
            <i className="fas fa-times"></i> Limpiar Filtros
          </button>
          <button className="btn btn-export" onClick={handleExportSelected} disabled={selectedContacts.size === 0}>
            <i className="fas fa-download"></i> Exportar Seleccionados
          </button>
        </div>

        <div className={`selection-info ${selectionInfo.show ? 'show' : ''}`}>
          <span>{selectionInfo.count}</span> contactos seleccionados
        </div>

        <div className="filter-container">
          <button
            className={`filter-btn ${currentFilter === 'all' ? 'active' : ''}`}
            onClick={() => setCurrentFilter('all')}
          >
            <i className="fas fa-users"></i> Todos
          </button>
          <button
            className={`filter-btn ${currentFilter === 'contact' ? 'active' : ''}`}
            onClick={() => setCurrentFilter('contact')}
          >
            <i className="fas fa-user"></i> Contactos
          </button>
          <button
            className={`filter-btn ${currentFilter === 'group' ? 'active' : ''}`}
            onClick={() => setCurrentFilter('group')}
          >
            <i className="fas fa-users"></i> Grupos
          </button>
        </div>

        <div className="advanced-filters">
          <div className="filter-section">
            <h3>Filtros Avanzados</h3>
            <div className="filter-inputs">
              <div className="input-group">
                <label htmlFor="countryCode">
                  <i className="fas fa-flag"></i> Código de País
                </label>
                <input
                  type="text"
                  id="countryCode"
                  placeholder="Ej: 521 (México)"
                  value={countryCode}
                  maxLength={5}
                  onChange={(event) => setCountryCode(event.target.value)}
                />
                <small>Por defecto: 521 (México)</small>
              </div>

              <div className="input-group">
                <label htmlFor="areaCodes">
                  <i className="fas fa-map-marker-alt"></i> Códigos de Área
                </label>
                <input
                  type="text"
                  id="areaCodes"
                  placeholder="Ej: 999,981,996 (separados por comas)"
                  value={areaCodesInput}
                  maxLength={50}
                  onChange={(event) => setAreaCodesInput(event.target.value)}
                />
                <small>Múltiples códigos separados por comas: 999,981,996</small>
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

              <button className="btn btn-filter" onClick={handleApplyAdvancedFilters}>
                <i className="fas fa-filter"></i> Aplicar Filtros
              </button>
            </div>
          </div>
        </div>

        <div className="contacts-container">
          <div className="contacts-header">
            <h2 className="contacts-title">Mis Contactos</h2>
            <div className="contacts-actions">
              <span className="contacts-count" id="count">{contactsCountLabel}</span>
              <div className="bulk-actions">
                <button className="btn-bulk" onClick={handleSelectAll}>
                  <i className="fas fa-check-double"></i> Seleccionar Todos
                </button>
                <button className="btn-bulk" onClick={handleDeselectAll}>
                  <i className="fas fa-times"></i> Deseleccionar Todos
                </button>
              </div>
            </div>
          </div>

          <div className="contacts-grid" id="contacts">
            <ModuleComponent {...moduleProps} />
          </div>
        </div>

        <div className="raw-data">
          <div className="raw-header">
            <h3 className="raw-title">Datos Técnicos</h3>
            <button className="raw-toggle" onClick={toggleRawData}>
              <i className="fas fa-code"></i> <span>{showRaw ? 'Ocultar JSON' : 'Mostrar JSON'}</span>
            </button>
          </div>
          <div className={`raw-content ${showRaw ? 'show' : ''}`}>
            <pre>{rawData}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contacts