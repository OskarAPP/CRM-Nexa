import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './login.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

type LoginStage = 'form' | 'success' | 'qr'

type LoginPayloadUser = {
  id?: number | string
  nombres?: string
  [key: string]: unknown
}

type LoginPayloadCredential = {
  user_id?: number | string
  [key: string]: unknown
}

type LoginSuccessPayload = {
  Id?: number | string
  id?: number | string
  user_id?: number | string
  user?: LoginPayloadUser | null
  token?: unknown
  credencial_whatsapp?: LoginPayloadCredential | null
  [key: string]: unknown
}

function coerceQrDataUrl(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith('data:')) {
    const [meta, data] = trimmed.split(',', 2)
    if (!data) return trimmed
    return `${meta},${data.replace(/\s+/g, '')}`
  }
  return `data:image/png;base64,${trimmed.replace(/\s+/g, '')}`
}

function extractQrFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const source = payload as Record<string, unknown>
  const candidates = [
    source.whatsapp_api_response,
    source.whatsappApiResponse,
    source.whatsapp_response,
    source.whatsappResponse,
  ]

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue
    const qrCandidate = (candidate as Record<string, unknown>).base64 ??
      (candidate as Record<string, unknown>).qr ??
      (candidate as Record<string, unknown>).image
    if (typeof qrCandidate === 'string' && qrCandidate.trim().length > 0) {
      return qrCandidate
    }
  }

  const topLevel = source.base64 ?? source.qr ?? source.image
  if (typeof topLevel === 'string' && topLevel.trim().length > 0) {
    return topLevel
  }

  return null
}

function persistAuthSnapshot(payload: LoginSuccessPayload) {
  if (typeof window === 'undefined' || !window.localStorage || !payload) return

  const entries: Array<[string, string]> = []
  const user = payload.user ?? null

  const nombresValue = typeof user?.nombres === 'string' ? user.nombres : undefined
  if (nombresValue && nombresValue.trim().length > 0) {
    entries.push(['nombres', nombresValue.trim()])
  }

  const idCandidate = payload.Id ?? payload.id ?? user?.id
  if (idCandidate !== undefined && idCandidate !== null) {
    entries.push(['Id', String(idCandidate)])
  }

  const credentialUserId = payload.credencial_whatsapp?.user_id
  const userIdCandidate = payload.user_id ?? credentialUserId ?? idCandidate ?? user?.id
  if (userIdCandidate !== undefined && userIdCandidate !== null) {
    entries.push(['user_id', String(userIdCandidate)])
  }

  if (payload.token !== undefined && payload.token !== null) {
    entries.push(['token', String(payload.token)])
  }

  try {
    for (const [key, value] of entries) {
      window.localStorage.setItem(key, value)
    }
  } catch (error) {
    console.error('No se pudo guardar la sesión en localStorage', error)
  }
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [stage, setStage] = useState<LoginStage>('form')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isQrLoading, setIsQrLoading] = useState(false)
  const [qrSrc, setQrSrc] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(120) // 2 minutos en segundos
  const [lastLoginPayload, setLastLoginPayload] = useState<LoginSuccessPayload | null>(null)

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

  // Timer para el QR
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (stage === 'qr' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (interval) clearInterval(interval)
            handleBackToLogin()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [stage, timeLeft])

  async function requestLoginPayload(): Promise<LoginSuccessPayload> {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      throw new Error(res.status === 401 ? 'Credenciales incorrectas' : `Error ${res.status}`)
    }

    const payload = (await res.json()) as LoginSuccessPayload
    persistAuthSnapshot(payload)
    return payload
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const payload = await requestLoginPayload()
      setLastLoginPayload(payload)

      // Mostrar mensaje de éxito antes del QR
      setStage('success')
      
      // Esperar 2 segundos antes de mostrar el QR
      setTimeout(() => {
        handleShowQr(payload)
      }, 2000)

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      setErrorMessage(message)
      setIsQrLoading(false)
      setStage('form')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleShowQr(prefetched?: LoginSuccessPayload | null) {
    try {
      setIsQrLoading(true)
      const payload = prefetched ?? lastLoginPayload ?? (await requestLoginPayload())
      setLastLoginPayload(payload)

      const qrCandidate = extractQrFromPayload(payload)

      if (!qrCandidate) {
        throw new Error('La respuesta no contiene un código QR válido')
      }

      setErrorMessage(null)
      setStage('qr')
      setQrSrc(coerceQrDataUrl(qrCandidate))
      setTimeLeft(120) // Reiniciar timer
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al cargar el QR'
      setErrorMessage(message)
      setStage('form')
      setIsQrLoading(false)
    }
  }

  function handleBackToLogin() {
    setStage('form')
    setQrSrc(null)
    setIsQrLoading(false)
    setErrorMessage(null)
    setEmail('')
    setPassword('')
    setShowPassword(false)
    setTimeLeft(120)
    setLastLoginPayload(null)
  }

  function handleQrLoad() {
    setIsQrLoading(false)
  }

  function handleQrError() {
    setIsQrLoading(false)
    setQrSrc(null)
    setErrorMessage('No se pudo mostrar la imagen del QR. Intenta generar uno nuevamente.')
  }

  function handleGoToDashboard() {
    // Redirección al dashboard
    navigate('/home-dashboard')
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-hero__badge">Gestiona tu CRM</div>
        <h1>
          Construye relaciones <span>más inteligentes</span>
        </h1>
        <p>
          Centraliza la información de tus clientes, automatiza seguimientos y toma decisiones impulsadas por datos.
        </p>
        <div className="login-hero__highlights">
          <div>
            <h3>Pipeline en vivo</h3>
            <p>Visualiza oportunidades, tareas críticas y actividades pendientes en tiempo real.</p>
          </div>
          <div>
            <h3>Insights accionables</h3>
            <p>Recibe recomendaciones inteligentes para priorizar tus próximos pasos.</p>
          </div>
          <div>
            <h3>Experiencia omnicanal</h3>
            <p>Administra conversaciones, agendas y documentos desde un mismo panel.</p>
          </div>
        </div>
      </div>

      <div className="login-card">
        <div className="login-card__header">
          <div className="login-card__logo">Nexa CRM</div>
          <span className="login-card__subtitle">
            {stage === 'form' && 'Ingresá a tu panel de control'}
            {stage === 'success' && '¡Inicio de sesión exitoso!'}
            {stage === 'qr' && 'Vincula tu WhatsApp escaneando el código QR'}
          </span>
        </div>

        {stage === 'form' ? (
          <>
            <form className="login-card__form" onSubmit={handleSubmit}>
              <label className="login-field">
                <span>Correo empresarial</span>
                <div className="login-input">
                  <i className="fas fa-envelope"></i>
                  <input
                    type="email"
                    placeholder="nombre@empresa.com"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
              </label>

              <label className="login-field">
                <span>Contraseña</span>
                <div className="login-input">
                  <i className="fas fa-lock"></i>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="login-toggle"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </label>

              <div className="login-quick-actions">
                <label className="remember-toggle">
                  <input type="checkbox" disabled />
                  <span className="remember-indicator"></span>
                  Recordarme
                </label>
                <button type="button" className="minimal-link" disabled>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {errorMessage && (
                <div className="login-alert login-alert--error" role="alert">
                  <i className="fas fa-circle-exclamation"></i>
                  <span>{errorMessage}</span>
                </div>
              )}

              <button className="login-submit" type="submit" disabled={isLoading}>
                {isLoading ? 'Validando...' : 'Acceder a Nexa CRM'}
              </button>
            </form>

            <div className="login-divider">
              <span>o ingresa con</span>
            </div>

            <div className="login-social">
              <button type="button" disabled>
                <i className="fab fa-google"></i>
                Google Workspace
              </button>
              <button type="button" disabled>
                <i className="fab fa-microsoft"></i>
                Microsoft Entra ID
              </button>
            </div>

            <div className="login-footer">
              <p>
                ¿No tienes una cuenta? <button type="button" className="minimal-link" disabled>Habla con ventas</button>
              </p>
            </div>
          </>
        ) : stage === 'success' ? (
          <div className="login-success">
            <div className="login-success__icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="login-success__message">
              <h3>¡Inicio de sesión exitoso!</h3>
              <p>Redirigiendo al escáner de QR...</p>
            </div>
            <div className="login-spinner"></div>
          </div>
        ) : (
          <div className="login-qr">
            <div className="login-qr__meta">
              <p><strong>Instrucciones para vincular WhatsApp:</strong></p>
              <ol className="login-qr__instructions">
                <li>Abre la aplicación de WhatsApp en tu teléfono móvil</li>
                <li>Toca los tres puntos (⋮) en la esquina superior derecha</li>
                <li>Selecciona "Dispositivos vinculados"</li>
                <li>Toca "Vincular un dispositivo"</li>
                <li>Escanea el código QR que se muestra a continuación</li>
                <li>Espera a que se complete la sincronización</li>
                <li>Una vez sincronizado, presiona el botón "Ir al Dashboard"</li>
              </ol>
              <p className="login-qr__hint">
                ⏱️ Tiempo restante: <strong>{formatTime(timeLeft)}</strong>
                {timeLeft <= 30 && (
                  <span style={{color: '#f87171', marginLeft: '8px'}}>
                    ⚠️ El código expirará pronto
                  </span>
                )}
              </p>
            </div>

            <div className="login-qr__visual" aria-live="polite">
              {isQrLoading && (
                <div className="login-spinner" role="status" aria-label="Cargando código QR"></div>
              )}
              {qrSrc && (
                <img
                  src={qrSrc}
                  alt="Código QR para vincular WhatsApp"
                  onLoad={handleQrLoad}
                  onError={handleQrError}
                  style={{ opacity: isQrLoading ? 0 : 1 }}
                />
              )}
            </div>

            {errorMessage && (
              <div className="login-alert login-alert--error" role="alert">
                <i className="fas fa-circle-exclamation"></i>
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="login-qr__actions">
              <button type="button" className="login-dashboard" onClick={handleGoToDashboard}>
                <i className="fas fa-arrow-right"></i>
                Ir al Dashboard
              </button>
              <button type="button" className="login-back" onClick={handleBackToLogin}>
                <i className="fas fa-arrow-left"></i>
                Volver al inicio de sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}