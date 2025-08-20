import './inicio.css'

type KPI = {
  label: string
  value: string | number

  delta?: number // percentage change vs. last period
}

type Lead = {
  name: string
  status: 'Nuevo' | 'En progreso' | 'Contactado' | 'Cerrado'
  owner: string
  date: string
}

const kpis: KPI[] = [
  { label: 'Leads', value: 128, delta: 12.5 },
  { label: 'Oportunidades', value: 42, delta: 3.1 },
  { label: 'Negocios ganados', value: 18, delta: 5.4 },
  { label: 'Ingresos (30 días)', value: '$24,800', delta: -1.2 },
]

const recentLeads: Lead[] = [
  { name: 'María López', status: 'En progreso', owner: 'Carlos', date: '2025-08-15' },
  { name: 'Juan Pérez', status: 'Nuevo', owner: 'Laura', date: '2025-08-14' },
  { name: 'Acme Corp.', status: 'Contactado', owner: 'Sofía', date: '2025-08-13' },
  { name: 'Beta SA', status: 'Cerrado', owner: 'Diego', date: '2025-08-12' },
]

export default function Inicio() {
  return (
    <div className="inicio">
      <div className="inicio__inner">
        <header className="inicio__header">
          <div>
            <h1 className="inicio__title">Panel de inicio</h1>
            <p className="inicio__subtitle">Resumen de actividad y accesos rápidos</p>
          </div>
          <div className="inicio__user">
            <input className="inicio__search" placeholder="Buscar..." aria-label="Buscar" />
            <div className="inicio__avatar" aria-hidden />
          </div>
        </header>

        <section className="inicio__stats" aria-label="Indicadores clave">
          {kpis.map((k) => (
            <article key={k.label} className="card kpi">
              <div className="kpi__label">{k.label}</div>
              <div className="kpi__value">{k.value}</div>
              {typeof k.delta === 'number' && (
                <div className={`kpi__delta ${k.delta >= 0 ? 'up' : 'down'}`}>
                  {k.delta >= 0 ? '▲' : '▼'} {Math.abs(k.delta)}%
                </div>
              )}
            </article>
          ))}
        </section>

        <section className="inicio__actions" aria-label="Acciones rápidas">
          <button className="btn primary">Nuevo lead</button>
          <button className="btn">Nuevo contacto</button>
          <button className="btn">Programar reunión</button>
        </section>

        <section className="inicio__panel">
          <div className="card">
            <div className="card__header">
              <h2 className="card__title">Leads recientes</h2>
              <a className="card__link" href="#">Ver todos</a>
            </div>
            <div className="table__wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Estado</th>
                    <th>Propietario</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((l) => (
                    <tr key={`${l.name}-${l.date}`}>
                      <td data-label="Nombre">{l.name}</td>
                      <td data-label="Estado">
                        <span className={`badge status-${normalize(l.status)}`}>{l.status}</span>
                      </td>
                      <td data-label="Propietario">{l.owner}</td>
                      <td data-label="Fecha">{formatDate(l.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-')
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return iso
  }
}
