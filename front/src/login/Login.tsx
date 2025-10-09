import { useEffect, useState } from 'react'
import './login.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [responseText, setResponseText] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

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
    setResponseText('Iniciando sesión...')

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const text = await res.text()
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = text || 'Respuesta vacía del servidor'
      }

      setResponseText(typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      setResponseText(`Error de red: ${message}`)
    } finally {
      setIsLoading(false)
    }
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
          <span className="login-card__subtitle">Ingresá a tu panel de control</span>
        </div>

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

          <button className="login-submit" type="submit" disabled={isLoading}>
            {isLoading ? 'Validando...' : 'Acceder a Nexa CRM'}
          </button>
        </form>

        {responseText && (
          <div className="login-response" role="status" aria-live="polite">
            <pre>{responseText}</pre>
          </div>
        )}

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
      </div>
    </div>
  )
}
