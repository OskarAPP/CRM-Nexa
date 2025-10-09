import './login.css'

export default function Login() {
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

        <form className="login-card__form">
          <label className="login-field">
            <span>Correo empresarial</span>
            <div className="login-input">
              <i className="fas fa-envelope"></i>
              <input type="email" placeholder="nombre@empresa.com" autoComplete="email" disabled />
            </div>
          </label>

          <label className="login-field">
            <span>Contraseña</span>
            <div className="login-input">
              <i className="fas fa-lock"></i>
              <input type="password" placeholder="••••••••" autoComplete="off" disabled />
              <button type="button" className="login-toggle" disabled>
                <i className="fas fa-eye-slash"></i>
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

          <button className="login-submit" type="button" disabled>
            Acceder a Nexa CRM
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
      </div>
    </div>
  )
}
