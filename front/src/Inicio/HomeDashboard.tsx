import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './home.css'

type SessionSnapshot = {
  name: string | null
  id: string | null
  userId: string | null
  token: string | null
}

type CopyState = 'idle' | 'copied' | 'error'

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

export default function HomeDashboard() {
  const [session, setSession] = useState<SessionSnapshot>(() => readSessionFromStorage())
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const navigate = useNavigate()

  const refreshSession = useCallback(() => {
    setSession(readSessionFromStorage())
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

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || STORAGE_KEYS_SET.has(event.key)) {
        refreshSession()
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [refreshSession])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (copyState === 'idle') return

    const timeout = window.setTimeout(() => setCopyState('idle'), copyState === 'copied' ? 2200 : 3200)
    return () => window.clearTimeout(timeout)
  }, [copyState])

  const displayName = useMemo(() => {
    if (!session.name) return DEFAULT_NAME
    const clean = session.name.trim()
    if (!clean) return DEFAULT_NAME
    const firstWord = clean.split(/\s+/)[0]
    if (!firstWord) return DEFAULT_NAME
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase()
  }, [session.name])

  const fullName = useMemo(() => session.name ?? `${DEFAULT_NAME} CRM`, [session.name])

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
        ? 'Este es tu panel general: métricas, campañas y actividad sincronizadas en tiempo real.'
        : 'Accede con tus credenciales para personalizar este panel con tus datos e integraciones.',
    [session.name]
  )

  const sessionDetails = useMemo(
    () => [
      { label: 'ID de cuenta', value: session.id ?? 'No asignado' },
      { label: 'User ID', value: session.userId ?? 'No asignado' },
    ],
    [session.id, session.userId]
  )

  const maskedToken = useMemo(() => {
    if (!session.token) return 'No asignado'
    if (session.token.length <= 14) return session.token
    return `${session.token.slice(0, 6)}····${session.token.slice(-4)}`
  }, [session.token])

  const hasSession = useMemo(
    () => Boolean(session.name || session.id || session.userId || session.token),
    [session.name, session.id, session.userId, session.token]
  )

  const integrationHint = useMemo(
    () =>
      hasSession
        ? 'Comparte estos identificadores con tu equipo técnico para conectar automatizaciones y bots.'
        : 'Una vez que inicies sesión, mostraremos aquí los identificadores para tus integraciones.',
    [hasSession]
  )

  const copyLabel = useMemo(
    () => (copyState === 'copied' ? 'Copiado' : copyState === 'error' ? 'Intenta nuevamente' : 'Copiar token'),
    [copyState]
  )

  const handleCopyToken = useCallback(async () => {
    if (!session.token) return
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      setCopyState('error')
      return
    }

    try {
      await navigator.clipboard.writeText(session.token)
      setCopyState('copied')
    } catch (error) {
      console.warn('No se pudo copiar el token al portapapeles', error)
      setCopyState('error')
    }
  }, [session.token])

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
          <p>Pro tip</p>
          <span>Integra tu WhatsApp Business API para métricas en tiempo real.</span>
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

        <section className="session-summary glass">
          <div className="session-greeting">
            <span className="session-chip">Panel general</span>
            <h2>Visión general de {displayName}</h2>
            <p>
              {session.name
                ? `Gracias por volver, ${displayName}. Mantén la sesión activa para no perder ninguna conversación.`
                : 'No hemos detectado una sesión guardada. Cuando inicies sesión podrás ver aquí tu información personalizada.'}
            </p>
            <div className="session-identity">
              <span className="session-identity__label">
                {hasSession ? 'Sesión personalizada' : 'Sesión pendiente'}
              </span>
              <strong>{hasSession ? fullName : 'Sin identificar'}</strong>
              <small>
                {session.id
                  ? `ID interno ${session.id}`
                  : 'Sincroniza tus credenciales para generar un ID interno.'}
              </small>
            </div>
            <button type="button" className="ghost-btn session-refresh" onClick={refreshSession}>
              <i className="fas fa-rotate-right" aria-hidden="true"></i>
              <span>Actualizar datos</span>
            </button>
          </div>

          <div className="session-meta">
            <div className="session-meta__grid">
              {sessionDetails.map(({ label, value }) => (
                <article key={label} className="session-meta__item">
                  <span className="session-meta__label">{label}</span>
                  <span className="session-meta__value">{value}</span>
                </article>
              ))}
            </div>

            <div className="session-token">
              <div className="session-token__label">
                Token de autenticación
                {copyState === 'copied' && (
                  <span className="session-feedback session-feedback--success">¡Copiado!</span>
                )}
                {copyState === 'error' && (
                  <span className="session-feedback session-feedback--error">No se pudo copiar</span>
                )}
              </div>
              <code title={session.token ?? 'Sin token disponible'}>{maskedToken}</code>
              <button
                type="button"
                className="session-token__button"
                onClick={handleCopyToken}
                disabled={!session.token}
              >
                <i className="fas fa-copy" aria-hidden="true"></i>
                <span>{copyLabel}</span>
              </button>
              <p className="session-meta__hint">{integrationHint}</p>
            </div>
          </div>
        </section>

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
