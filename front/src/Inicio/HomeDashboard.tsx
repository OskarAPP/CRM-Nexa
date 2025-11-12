import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './home.css'
import {
  TEMPLATE_CHANGED_EVENT,
  fetchTemplatesFromApi,
  countNumbersFromString,
  ApiError,
  type MessageTemplate,
} from '../mensajes/templateHistory'

type SessionSnapshot = {
  name: string | null
  id: string | null
  userId: string | null
  token: string | null
}

const DEFAULT_NAME = 'Nexa'
const DEFAULT_SESSION: SessionSnapshot = {
  name: null,
  id: null,
  userId: null,
  token: null,
}

const STORAGE_FIELD_KEYS = {
  name: ['nombres', 'nombre'],
  id: ['Id', 'id'],
  userId: ['user_id'],
  token: ['token'],
} as const

const STORAGE_KEYS_SET = new Set<string>(
  Object.values(STORAGE_FIELD_KEYS)
    .flat()
    .map((key) => key)
)

const sanitizeValue = (value: string | null) => {
  if (!value) return null
  const clean = value.trim()
  return clean.length > 0 ? clean : null
}

const readSessionFromStorage = (): SessionSnapshot => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_SESSION
  }

  try {
    const storage = window.localStorage

    const pickValue = (keys: ReadonlyArray<string>) => {
      for (const key of keys) {
        const value = sanitizeValue(storage.getItem(key))
        if (value) {
          return value
        }
      }
      return null
    }

    return {
      name: pickValue(STORAGE_FIELD_KEYS.name),
      id: pickValue(STORAGE_FIELD_KEYS.id),
      userId: pickValue(STORAGE_FIELD_KEYS.userId),
      token: pickValue(STORAGE_FIELD_KEYS.token),
    }
  } catch (error) {
    console.warn('No se pudo leer la sesión guardada en localStorage', error)
    return DEFAULT_SESSION
  }
}

const sortTemplatesByUpdatedAt = (list: MessageTemplate[]): MessageTemplate[] =>
  list
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

export default function HomeDashboard() {
  const [session, setSession] = useState<SessionSnapshot>(() => readSessionFromStorage())
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const navigate = useNavigate()

  const refreshSession = useCallback(() => {
    setSession(readSessionFromStorage())
  }, [])

  const refreshTemplates = useCallback(async () => {
    try {
      const response = await fetchTemplatesFromApi()
      setTemplates(sortTemplatesByUpdatedAt(response))
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setTemplates([])
        return
      }
      console.warn('No se pudieron cargar las plantillas desde la API', error)
    }
  }, [])

  useEffect(() => {
    const id = 'fa-css-cdn'
    if (!document.getElementById(id)) {
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
      document.head.appendChild(link)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    refreshSession()
    void refreshTemplates()

    const handleStorage = (event: StorageEvent) => {
      if (!event.key) {
        refreshSession()
        void refreshTemplates()
        return
      }
      if (STORAGE_KEYS_SET.has(event.key)) {
        refreshSession()
      }
    }

    const templateListener: EventListener = () => {
      void refreshTemplates()
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener(TEMPLATE_CHANGED_EVENT, templateListener)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(TEMPLATE_CHANGED_EVENT, templateListener)
    }
  }, [refreshSession, refreshTemplates])

  const displayName = useMemo(() => {
    if (!session.name) return DEFAULT_NAME
    const clean = session.name.trim()
    if (!clean) return DEFAULT_NAME
    const firstWord = clean.split(/\s+/)[0]
    if (!firstWord) return DEFAULT_NAME
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase()
  }, [session.name])

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }, [])

  const welcomeTitle = useMemo(() => `${timeGreeting}, ${displayName}!`, [timeGreeting, displayName])

  const welcomeSubtitle = useMemo(
    () =>
      session.name
        ? 'Explora tus campañas, estadísticas y actividad reciente.'
        : 'Accede con tus credenciales para personalizar este panel con tus datos e integraciones.',
    [session.name]
  )

  const templateDateFormatter = useMemo(
    () => new Intl.DateTimeFormat('es-MX', { month: 'short', day: 'numeric' }),
    []
  )

  const formatTemplateDate = useCallback(
    (value: string) => {
      try {
        return templateDateFormatter.format(new Date(value))
      } catch {
        return 'Sin fecha'
      }
    },
    [templateDateFormatter]
  )

  const templatePreview = useMemo(() => templates.slice(0, 4), [templates])

  const quickLinks = [
    {
      icon: 'fa-comments-dollar',
      label: 'Mensajes masivos',
      description: 'Programa campañas y automatiza seguimientos',
      path: '/mensajes',
      accent: 'accent-blue',
      disabled: false,
    },
    {
      icon: 'fa-users',
      label: 'Contactos',
      description: 'Gestiona leads, segmentos y estados',
      path: '/contactos',
      accent: 'accent-purple',
      disabled: false,
    },
    {
      icon: 'fa-bullhorn',
      label: 'Campañas activas',
      description: 'Revisa tus flujos de publicidad en curso',
      path: null,
      accent: 'accent-teal',
      disabled: true,
    },
  ] as const

  const campaignCards = [
    {
      title: 'Campaña de bienvenida',
      channel: 'WhatsApp',
      status: 'En curso',
      rate: '68% tasa de apertura',
      tag: 'Masivo · Segmento nuevos leads',
    },
    {
      title: 'Promoción Octubre',
      channel: 'Email + WhatsApp',
      status: 'Finalizada',
      rate: '32% tasa de conversión',
      tag: 'Publicidad · Segmento compradores 2024',
    },
    {
      title: 'Recordatorio de renovación',
      channel: 'SMS',
      status: 'Programada',
      rate: 'Inicio mañana 09:00',
      tag: 'Automatización · Clientes actuales',
    },
  ]

  const activityFeed = [
    {
      icon: 'fa-paper-plane',
      user: 'Laura Méndez',
      action: 'envió 450 mensajes de seguimiento',
      time: 'Hace 12 minutos',
    },
    {
      icon: 'fa-user-plus',
      user: 'ID automatización',
      action: 'agregó 38 leads desde formulario web',
      time: 'Hoy 08:24',
    },
    {
      icon: 'fa-chart-line',
      user: 'Dashboard IA',
      action: 'detectó oportunidad de venta cruzada',
      time: 'Ayer 18:03',
    },
  ]

  const stats = [
    {
      label: 'Mensajes enviados esta semana',
      value: '1,420',
      trend: '+18% vs. semana anterior',
      icon: 'fa-paper-plane',
      color: 'card-navy',
    },
    {
      label: 'Campañas activas',
      value: '5',
      trend: '2 finalizan hoy',
      icon: 'fa-bullseye',
      color: 'card-indigo',
    },
    {
      label: 'Tasa de respuesta promedio',
      value: '42%',
      trend: '+6 pts. este mes',
      icon: 'fa-reply-all',
      color: 'card-cyan',
    },
  ]

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return

    const storedUserId = session.userId ?? (typeof window !== 'undefined' ? sanitizeValue(window.localStorage.getItem('user_id')) : null)
    if (!storedUserId) {
      setLogoutError('No se encontró un identificador de usuario en la sesión actual.')
      return
    }

    const parsedUserId = Number(storedUserId)
    if (!Number.isFinite(parsedUserId)) {
      setLogoutError('El identificador de usuario almacenado no es válido.')
      return
    }

    const storedToken = session.token ?? (typeof window !== 'undefined' ? sanitizeValue(window.localStorage.getItem('token')) : null)
    if (!storedToken) {
      setLogoutError('No encontramos un token de autenticación para esta sesión. Inicia sesión nuevamente.')
      return
    }

    setIsLoggingOut(true)
    setLogoutError(null)

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
      const response = await fetch(`${API_BASE}/api/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${storedToken}`,
        },
        body: JSON.stringify({ user_id: parsedUserId }),
      })

      if (!response.ok) {
        const details = await response.text().catch(() => '')
        setLogoutError(`No se pudo cerrar sesión. HTTP ${response.status}: ${details || response.statusText}`)
        return
      }

      if (typeof window !== 'undefined' && window.localStorage) {
        const storage = window.localStorage
        ;['nombres', 'nombre', 'Id', 'id', 'user_id', 'token'].forEach((key) => storage.removeItem(key))
      }

      setSession({ ...DEFAULT_SESSION })
      navigate('/login', { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setLogoutError(`Error inesperado al cerrar sesión: ${message}`)
    } finally {
      setIsLoggingOut(false)
    }
  }, [isLoggingOut, navigate, session.userId, session.token])

  return (
    <div className="inicio-layout">
      <aside className="inicio-sidebar">
        <div className="sidebar-brand">
          <span className="brand-logo">Nexa CRM</span>
          <p>Control center</p>
        </div>

        <nav className="sidebar-nav">
          <h4>Accesos rápidos</h4>
          <ul>
            {quickLinks.map((item) => (
              <li key={item.label} className={item.accent}>
                <button
                  type="button"
                  onClick={() => {
                    if (item.path) {
                      navigate(item.path)
                    }
                  }}
                  disabled={item.disabled || !item.path}
                >
                  <i className={`fas ${item.icon}`}></i>
                  <div>
                    <span>{item.label}</span>
                    <small>{item.description}</small>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <i className="fas fa-arrow-right-from-bracket" aria-hidden="true"></i>
            <span>{isLoggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}</span>
          </button>
          {logoutError && <span className="logout-error">{logoutError}</span>}
        </div>
      </aside>

      <main className="inicio-main">
        <header className="inicio-header">
          <div>
            <h1>{welcomeTitle}</h1>
            <p>{welcomeSubtitle}</p>
          </div>
          <button
            type="button"
            className="cta-button"
            onClick={() => navigate('/mensajes')}
          >
            <i className="fas fa-plus" aria-hidden="true"></i> Crear nueva campaña
          </button>
        </header>

        <section className="stats-grid">
          {stats.map((stat) => (
            <article key={stat.label} className={`stat-card ${stat.color}`}>
              <div className="stat-icon">
                <i className={`fas ${stat.icon}`}></i>
              </div>
              <div className="stat-copy">
                <h3>{stat.value}</h3>
                <p>{stat.label}</p>
                <span>{stat.trend}</span>
              </div>
            </article>
          ))}
        </section>

        <section className="content-grid">
          <article className="campaigns-card glass">
            <div className="section-header">
              <div>
                <h2>Campañas recientes</h2>
                <p>Últimos envíos masivos y piezas publicitarias destacadas.</p>
              </div>
              <button type="button" className="ghost-btn">
                Ver historial
              </button>
            </div>

            <div className="campaign-list">
              {campaignCards.map((card) => (
                <div key={card.title} className="campaign-item">
                  <div className="campaign-icon">
                    <i className="fas fa-wave-square"></i>
                  </div>
                  <div className="campaign-copy">
                    <h3>{card.title}</h3>
                    <p>{card.tag}</p>
                    <div className="campaign-meta">
                      <span>
                        <i className="fas fa-share-alt"></i> {card.channel}
                      </span>
                      <span>
                        <i className="fas fa-signal"></i> {card.rate}
                      </span>
                    </div>
                  </div>
                  <span className="status-chip">{card.status}</span>
                </div>
              ))}
            </div>

            <div className="templates-preview">
              <div className="templates-preview__header">
                <h3>Plantillas guardadas</h3>
                <span>{templates.length} en total</span>
              </div>

              {templates.length === 0 ? (
                <p className="templates-preview__empty">
                  Aún no guardas configuraciones desde el módulo de mensajes.
                </p>
              ) : (
                <>
                  <div className="templates-preview__grid">
                    {templatePreview.map((tpl) => (
                      <article key={tpl.id} className={`template-chip template-chip--${tpl.type}`}>
                        <div className="template-chip__icon">
                          <i className={`fas ${tpl.type === 'texto' ? 'fa-font' : 'fa-photo-film'}`}></i>
                        </div>
                        <div className="template-chip__body">
                          <strong>{tpl.name}</strong>
                          <span>
                            {tpl.type === 'texto' ? 'Mensaje de texto' : 'Mensaje multimedia'} ·{' '}
                            {countNumbersFromString(tpl.payload.numeros)} destinatarios
                          </span>
                        </div>
                        <span className="template-chip__date">{formatTemplateDate(tpl.updatedAt)}</span>
                      </article>
                    ))}
                  </div>
                  <div className="templates-preview__footer">
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => navigate('/mensajes')}
                    >
                      Administrar plantillas
                    </button>
                    {templates.length > templatePreview.length && (
                      <span className="templates-preview__more">
                        +{templates.length - templatePreview.length} adicionales guardadas
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </article>

          <aside className="right-column">
            <section className="glass activity-card">
              <div className="section-header">
                <div>
                  <h2>Actividad del equipo</h2>
                  <p>Lo más relevante de las últimas horas.</p>
                </div>
              </div>

              <ul className="activity-feed">
                {activityFeed.map((item) => (
                  <li key={item.time}>
                    <div className="activity-icon">
                      <i className={`fas ${item.icon}`}></i>
                    </div>
                    <div>
                      <strong>{item.user}</strong>
                      <p>{item.action}</p>
                      <span>{item.time}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="glass performance-card">
              <div className="section-header">
                <div>
                  <h2>Performance mensual</h2>
                  <p>Evolución general de interacciones.</p>
                </div>
                <button type="button" className="ghost-btn">
                  Descargar reporte
                </button>
              </div>

              <div className="chart-placeholder">
                <div className="chart-bars">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, index) => (
                    <div key={day} className="chart-col">
                      <div className={`chart-bar bar-${index + 1}`}></div>
                      <span>{day}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </aside>
        </section>
      </main>
    </div>
  )
}
