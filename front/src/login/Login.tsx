import { useEffect, useState } from 'react'
import './login.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

type LoginStage = 'form' | 'qr'

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

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [stage, setStage] = useState<LoginStage>('form')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isQrLoading, setIsQrLoading] = useState(false)
  const [qrSrc, setQrSrc] = useState<string | null>(null)

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    try {
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

      const payload = await res.json()
      const qrCandidate = extractQrFromPayload(payload)

      if (!qrCandidate) {
        throw new Error('La respuesta no contiene un código QR válido')
      }

      setStage('qr')
      setIsQrLoading(true)
      setQrSrc(coerceQrDataUrl(qrCandidate))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      setErrorMessage(message)
      setIsQrLoading(false)
      setStage('form')
    } finally {
      setIsLoading(false)
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
  }

  function handleQrLoad() {
    setIsQrLoading(false)
  }

  function handleQrError() {
    setIsQrLoading(false)
    setQrSrc(null)
    setErrorMessage('No se pudo mostrar la imagen del QR. Intenta generar uno nuevamente.')
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
            {stage === 'form' ? 'Ingresá a tu panel de control' : 'Escanea tu código QR para vincular tu sesión'}
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
        ) : (
          <div className="login-qr">
            <div className="login-qr__meta">
              <p>Utiliza tu aplicación de WhatsApp para escanear el siguiente código y vincular tu sesión web.</p>
              <p className="login-qr__hint">Si necesitas cambiar de cuenta puedes regresar al formulario y volver a iniciar sesión.</p>
            </div>

            <div className="login-qr__visual" aria-live="polite">
              {isQrLoading && (
                <div className="login-spinner" role="status" aria-label="Cargando código QR"></div>
              )}
              {qrSrc && (
                <img
                  src={qrSrc}
                  alt="Código QR de autenticación"
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

            <button type="button" className="login-back" onClick={handleBackToLogin}>
              <i className="fas fa-arrow-left"></i>
              Volver al inicio de sesión
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
