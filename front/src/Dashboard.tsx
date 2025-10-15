import React from 'react';
import { useNavigate } from 'react-router-dom';
import './dashboard.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Aquí puedes agregar lógica de logout si es necesario
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-header__content">
          <div className="dashboard-header__top">
            <h1>¡Hola Mundo!</h1>
            <button className="logout-btn" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i>
              Cerrar Sesión
            </button>
          </div>
          <p>Bienvenido al Dashboard de Nexa CRM</p>
        </div>
      </div>
      
      <div className="dashboard-content">
        <div className="dashboard-card">
          <div className="dashboard-card__icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="dashboard-card__content">
            <h2>¡Autenticación Exitosa!</h2>
            <p>Tu sesión de WhatsApp ha sido vinculada correctamente.</p>
            <p>Ahora puedes comenzar a utilizar todas las funciones del CRM.</p>
          </div>
        </div>

        <div className="dashboard-features">
          <div className="feature-card">
            <i className="fas fa-comments"></i>
            <h3>Gestión de Conversaciones</h3>
            <p>Administra todos tus chats de WhatsApp desde un solo lugar.</p>
          </div>
          
          <div className="feature-card">
            <i className="fas fa-users"></i>
            <h3>Gestión de Contactos</h3>
            <p>Organiza y segmenta tu base de contactos eficientemente.</p>
          </div>
          
          <div className="feature-card">
            <i className="fas fa-chart-line"></i>
            <h3>Analíticas</h3>
            <p>Métricas y reportes detallados de tu desempeño.</p>
          </div>

          <div className="feature-card">
            <i className="fas fa-robot"></i>
            <h3>Automatización</h3>
            <p>Automatiza respuestas y flujos de conversación.</p>
          </div>

          <div className="feature-card">
            <i className="fas fa-tasks"></i>
            <h3>Gestión de Tareas</h3>
            <p>Organiza y prioriza tus actividades diarias.</p>
          </div>

          <div className="feature-card">
            <i className="fas fa-file-alt"></i>
            <h3>Reportes</h3>
            <p>Genera reportes detallados de tu productividad.</p>
          </div>
        </div>

        <div className="dashboard-actions">
          <button className="btn btn-primary">
            <i className="fas fa-rocket"></i>
            Comenzar a Usar
          </button>
          <button className="btn btn-secondary">
            <i className="fas fa-cog"></i>
            Configurar
          </button>
          <button className="btn btn-outline" onClick={handleLogout}>
            <i className="fas fa-arrow-left"></i>
            Volver al Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;