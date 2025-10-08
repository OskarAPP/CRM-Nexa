import { Fragment } from 'react'
import type { MouseEvent } from 'react'
import type { Contact, FilterTotals, FilterType, LoadingMode } from '../types'

type ToggleSelectionHandler = (jid?: string) => void

type FlagGetter = (code: string) => string

type PhoneFormatter = (number: string) => string

type CountryNameGetter = (code: string) => string

export interface ContactsModuleProps {
  type: FilterType
  contacts: Contact[]
  allContacts: Contact[]
  isLoading: boolean
  loadingMode: LoadingMode
  errorMessage: string | null
  countryCode: string
  activeAreaCodes: string[]
  filterTotals: FilterTotals | null
  selectedContacts: Set<string>
  onToggleSelection: ToggleSelectionHandler
  formatPhoneNumber: PhoneFormatter
  getCountryFlag: FlagGetter
  getCountryName: CountryNameGetter
}

function renderLoading(loadingMode: LoadingMode) {
  const icon = loadingMode === 'filter' ? 'fa-filter' : 'fa-circle-notch'
  const title = loadingMode === 'filter' ? 'Aplicando filtros' : 'Cargando contactos'
  const message = loadingMode === 'filter'
    ? 'Filtrando contactos por código de país y áreas...'
    : 'Estamos obteniendo y organizando su información de contacto'
  return (
    <div className="loading">
      <i className={`fas ${icon} fa-spin`}></i>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  )
}

function renderEmptyState(allContacts: Contact[], countryCode: string, activeAreaCodes: string[], filterTotals: FilterTotals | null) {
  if (allContacts.length === 0) {
    return (
      <div className="empty-state">
        <i className="fas fa-address-book"></i>
        <h3>Lista de contactos vacía</h3>
        <p>Haga clic en "Sincronizar Contactos" para comenzar</p>
      </div>
    )
  }

  const details = [`Código de país: ${countryCode || '521'}`]
  if (activeAreaCodes.length > 0) {
    details.push(`Códigos de área: ${activeAreaCodes.join(', ')}`)
  }

  return (
    <div className="empty-state">
      <i className="fas fa-filter"></i>
      <h3>No hay contactos con este filtro</h3>
      <p>{details.join(' | ')}</p>
      {filterTotals && (
        <p>Se encontraron {filterTotals.total} contactos en total, pero ninguno coincide con los criterios.</p>
      )}
    </div>
  )
}

function renderError(errorMessage: string) {
  return (
    <div className="error-state">
      <i className="fas fa-exclamation-circle"></i>
      <h3>Error</h3>
      <p>{errorMessage}</p>
    </div>
  )
}

export default function ContactModuleBase({
  contacts,
  allContacts,
  isLoading,
  loadingMode,
  errorMessage,
  countryCode,
  activeAreaCodes,
  filterTotals,
  selectedContacts,
  onToggleSelection,
  formatPhoneNumber,
  getCountryFlag,
  getCountryName,
}: ContactsModuleProps) {
  if (isLoading) {
    return renderLoading(loadingMode)
  }

  if (errorMessage) {
    return renderError(errorMessage)
  }

  if (contacts.length === 0) {
    return renderEmptyState(allContacts, countryCode, activeAreaCodes, filterTotals)
  }

  return (
    <Fragment>
      {contacts.map((contact, index) => {
        const name = contact.pushName || 'Sin nombre'
        const jid = contact.remoteJid || ''
        const number = jid.split('@')[0] || 'N/A'
        const pic = contact.profilePicUrl
        const isGroup = jid.includes('g.us')
        const type = isGroup ? 'group' : 'contact'
        const typeText = isGroup ? 'Grupo' : 'Contacto'
        const flagCode = number.length > 3 ? getCountryFlag(number.substring(0, 3)) : 'question'
        const isSelected = jid ? selectedContacts.has(jid) : false
        const formattedNumber = number ? formatPhoneNumber(number) : 'N/A'

        const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
          if ((event.target as HTMLElement).closest('.contact-checkbox')) {
            return
          }
          onToggleSelection(jid)
        }

        const handleCheckboxClick = (event: MouseEvent<HTMLDivElement>) => {
          event.stopPropagation()
          onToggleSelection(jid)
        }

        return (
          <div
            key={jid || `contact-${index}`}
            className={`contact-card ${type} ${isSelected ? 'selected' : ''}`}
            onClick={handleCardClick}
          >
            <div className="contact-checkbox" onClick={handleCheckboxClick}></div>
            <div
              className={`avatar ${type}`}
              style={pic ? { backgroundImage: `url(${pic})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            >
              {!pic && (name.charAt(0).toUpperCase() || '?')}
              <div className={`badge ${type}`}>
                <i className={`fas ${isGroup ? 'fa-users' : 'fa-user'}`}></i>
              </div>
            </div>
            <div className="contact-info">
              <div>
                <span className={`contact-type type-${type}`}>{typeText}</span>
              </div>
              <h3 className="contact-name">{name}</h3>
              <p className="contact-number">
                {flagCode !== 'question' ? (
                  <span className={`fi fi-${flagCode} country-flag`} title={getCountryName(flagCode)}></span>
                ) : (
                  <i className="fas fa-question-circle" style={{ color: '#94a3b8' }}></i>
                )}
                {formattedNumber}
              </p>
            </div>
          </div>
        )
      })}
    </Fragment>
  )
}
