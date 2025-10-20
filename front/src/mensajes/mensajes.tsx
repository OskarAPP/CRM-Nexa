import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './mensajes.css'

type TabKey = 'texto' | 'media'
type MediaType = 'image' | 'video' | 'audio' | 'document'

export default function Mensajes() {
  return <MessageManager />
}

function MessageManager() {
  // Cargar Font Awesome para los íconos
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

  const [activeTab, setActiveTab] = useState<TabKey>('texto')
  // Texto state
  const [numerosTexto, setNumerosTexto] = useState('5219961122642,5219821295240,5215626058831')
  const [mensaje, setMensaje] = useState('Hola 👋 este es un mensaje de prueba')
  const [isManualTexto, setIsManualTexto] = useState(true)
  const [csvCountTexto, setCsvCountTexto] = useState(0)
  const csvInputTextoRef = useRef<HTMLInputElement | null>(null)
  // Media state
  const [numerosMedia, setNumerosMedia] = useState('5219961122642,5219821295240')
  const [mediaBase64, setMediaBase64] = useState('')
  const [fileName, setFileName] = useState('')
  const [caption, setCaption] = useState('')
  const [mediaType, setMediaType] = useState<MediaType>('document')
  const [mimeType, setMimeType] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isManualMedia, setIsManualMedia] = useState(true)
  const [csvCountMedia, setCsvCountMedia] = useState(0)
  const csvInputMediaRef = useRef<HTMLInputElement | null>(null)

  // Resultados
  const [resultText, setResultText] = useState('// Los resultados de sus envíos aparecerán aquí')
  const [showDetails, setShowDetails] = useState(false)

  const resolveUserId = useCallback((): number | null => {
    if (typeof window === 'undefined') return null
    try {
      const raw = window.localStorage.getItem('user_id')
      if (!raw) return null
      const trimmed = raw.trim()
      if (!trimmed) return null
      const parsed = Number(trimmed)
      return Number.isFinite(parsed) ? parsed : null
    } catch {
      return null
    }
  }, [])

  const autoTypeNode = useMemo(() => {
    if (!mimeType) {
      return <span className="type-placeholder">Seleccione un archivo para detectar automáticamente</span>
    }
    return (
      <div className="type-info">
            <div>
              <span className="type-badge media"><i className={`fas ${mediaIcon(mediaType)}`}></i>{mediaType.toUpperCase()}</span>
              <span className="type-badge mime"><i className="fas fa-code"></i>{mimeType}</span>
            </div>
            <small className="muted" style={{ marginTop: '.5rem' }}>Detectado automáticamente desde el archivo</small>
      </div>
    )
  }, [mediaType, mimeType])

  function mediaIcon(type: MediaType) {
    switch (type) {
      case 'image':
        return 'fa-image'
      case 'video':
        return 'fa-video'
      case 'audio':
        return 'fa-music'
      default:
        return 'fa-file'
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const mime = file.type || 'application/octet-stream'
    setMimeType(mime)
    let mType: MediaType = 'document'
    if (mime.startsWith('image/')) mType = 'image'
    else if (mime.startsWith('video/')) mType = 'video'
    else if (mime.startsWith('audio/')) mType = 'audio'
    setMediaType(mType)
    const reader = new FileReader()
    reader.onload = () => {
      const res = reader.result as string
      const base64 = res.includes(',') ? res.split(',')[1] : res
      setMediaBase64(base64)
      setFileName(file.name)
    }
    reader.readAsDataURL(file)
  }

  // === CSV helpers ===
  function extractNumbersFromCsv(text: string): string[] {
    const raw = text
      .split(/[\n,;\t]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    const cleaned = raw
      .map((s) => s.replace(/[^\d+]/g, '')) // keep digits and plus
      .map((s) => s.replace(/^\+/, '')) // remove leading + if present
      .filter((s) => s.length >= 8)
    // de-duplicate preserving order
    const seen = new Set<string>()
    const unique: string[] = []
    for (const n of cleaned) {
      if (!seen.has(n)) { seen.add(n); unique.push(n) }
    }
    return unique
  }

  async function handleCsvTexto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const content = await file.text()
      const nums = extractNumbersFromCsv(content)
      setNumerosTexto(nums.join(','))
      setCsvCountTexto(nums.length)
    } finally {
      // reset input so selecting the same file again still triggers change
      e.target.value = ''
    }
  }

  async function handleCsvMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const content = await file.text()
      const nums = extractNumbersFromCsv(content)
      setNumerosMedia(nums.join(','))
      setCsvCountMedia(nums.length)
    } finally {
      e.target.value = ''
    }
  }

  function clearCsvTexto() {
    setNumerosTexto('')
    setCsvCountTexto(0)
    if (csvInputTextoRef.current) csvInputTextoRef.current.value = ''
  }

  function clearCsvMedia() {
    setNumerosMedia('')
    setCsvCountMedia(0)
    if (csvInputMediaRef.current) csvInputMediaRef.current.value = ''
  }

  async function enviarMensajes() {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
    const numeros = numerosTexto.split(',').map((n) => n.trim()).filter(Boolean)
    if (!numeros.length) {
      setResultText('Error: Debe ingresar al menos un número válido')
      return
    }
    if (!mensaje.trim()) {
      setResultText('Error: El mensaje no puede estar vacío')
      return
    }
    const userId = resolveUserId()
    if (userId == null) {
      setResultText('Error: No se encontró un user_id válido en la sesión. Inicie sesión nuevamente.')
      return
    }
    setResultText('Enviando mensajes...')
    try {
      const resp = await fetch(`${API_BASE}/api/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, numeros, mensaje }),
      })
      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        setResultText(`HTTP ${resp.status} ${resp.statusText}\n${text}`)
        return
      }
      const data = await resp.json().catch(() => ({}))
      setResultText(JSON.stringify(data, null, 2))
    } catch (err: any) {
      setResultText('Error: ' + (err?.message || String(err)))
    }
  }

  async function enviarMedios() {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
    const numeros = numerosMedia.split(',').map((n) => n.trim()).filter(Boolean)
    if (!numeros.length) {
      setResultText('Error: Debe ingresar al menos un número válido')
      return
    }
    if (!mediaBase64.trim()) {
      setResultText('Error: Debe seleccionar un archivo para enviar')
      return
    }
    if (!fileName.trim()) {
      setResultText('Error: Debe proporcionar un nombre de archivo')
      return
    }
    const userId = resolveUserId()
    if (userId == null) {
      setResultText('Error: No se encontró un user_id válido en la sesión. Inicie sesión nuevamente.')
      return
    }
    setResultText('Enviando medios...')
    try {
      const resp = await fetch(`${API_BASE}/api/send-media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          numeros,
          mediatype: mediaType,
          mimetype: mimeType || 'application/octet-stream',
          media: mediaBase64,
          fileName,
          caption,
          delay: 1000,
          linkPreview: false,
        }),
      })
      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        setResultText(`HTTP ${resp.status} ${resp.statusText}\n${text}`)
        return
      }
      const data = await resp.json().catch(() => ({}))
      setResultText(JSON.stringify(data, null, 2))
    } catch (err: any) {
      setResultText('Error: ' + (err?.message || String(err)))
    }
  }

  function clearResults() {
    setResultText('')
  }

  return (
    <div className="mensajes mensajes-layout">
      <aside className="mensajes-sidebar">
        <div className="mensajes-sidebar__brand">
            <span className="mensajes-chip"><i className="fas fa-wand-magic-sparkles"></i> Centro de campañas</span>
          <h2>Mensajería inteligente</h2>
          <p>Coordina envíos masivos y adjunta contenido enriquecido sin salir del panel.</p>
        </div>

        <div className="mensajes-sidebar__actions">
          <button
            type="button"
            className={`mensajes-nav ${activeTab === 'texto' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('texto')}
          >
            <span className="mensajes-nav__icon"><i className="fas fa-font"></i></span>
            <div>
              <strong>Mensajes de texto</strong>
              <small>Plantillas personalizadas y envíos manuales</small>
            </div>
          </button>
          <button
            type="button"
            className={`mensajes-nav ${activeTab === 'media' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('media')}
          >
            <span className="mensajes-nav__icon"><i className="fas fa-photo-film"></i></span>
            <div>
              <strong>Mensajes multimedia</strong>
              <small>Documentos, imágenes, audio o video</small>
            </div>
          </button>
        </div>

        <div className="mensajes-sidebar__card">
          <div className="mensajes-sidebar__card-header">
            <h3>Estatus de preparación</h3>
            <span className="mensajes-status"><i className="fas fa-circle-notch"></i> Activo</span>
          </div>
          <ul className="mensajes-sidebar__list">
            <li>
              <span>Texto manual</span>
              <strong>{isManualTexto ? 'Editable' : 'CSV'}</strong>
            </li>
            <li>
              <span>Números para texto</span>
              <strong>{numerosTexto ? numerosTexto.split(',').filter(Boolean).length : 0}</strong>
            </li>
            <li>
              <span>Multimedia manual</span>
              <strong>{isManualMedia ? 'Editable' : 'CSV'}</strong>
            </li>
            <li>
              <span>Números multimedia</span>
              <strong>{numerosMedia ? numerosMedia.split(',').filter(Boolean).length : 0}</strong>
            </li>
          </ul>
        </div>

        <div className="mensajes-sidebar__footer">
          <button type="button" className="mensajes-link" onClick={() => setShowDetails(true)}>
            <i className="fas fa-code"></i> Ver detalles técnicos
          </button>
          <button type="button" className="mensajes-link" onClick={() => setShowDetails(false)}>
            <i className="fas fa-eye-slash"></i> Ocultar detalles
          </button>
        </div>
      </aside>

      <main className="mensajes-main">
        <header className="mensajes-header">
          <div>
            <h1>Orquestador de mensajes</h1>
            <p>Gestiona campañas, valida destinatarios y supervisa resultados en tiempo real.</p>
          </div>
          <div className="mensajes-header__actions">
            <button type="button" className="mensajes-ghost" onClick={() => setActiveTab('texto')}>
              <i className="fas fa-bolt"></i> Envío rápido
            </button>
            <button type="button" className="mensajes-ghost" onClick={() => setActiveTab('media')}>
              <i className="fas fa-upload"></i> Adjuntar medios
            </button>
          </div>
        </header>

        <div className="mensajes-body">
          <section className="mensajes-card">
            <div className="mensajes-tabs" role="tablist" aria-label="Tipo de envío">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'texto'}
                className={`mensajes-tab ${activeTab === 'texto' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('texto')}
              >
                <i className="fas fa-align-left"></i>
                <span>Mensaje de texto</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'media'}
                className={`mensajes-tab ${activeTab === 'media' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('media')}
              >
                <i className="fas fa-images"></i>
                <span>Mensaje con medios</span>
              </button>
            </div>

            <div className="mensajes-content" role="tabpanel" hidden={activeTab !== 'texto'}>
              <div className="field-group">
                <div className="field-group__header">
                  <label htmlFor="numeros-texto"><i className="fas fa-phone"></i> Números de destino</label>
                  <button
                    type="button"
                    className="mode-toggle"
                    onClick={() => setIsManualTexto((value) => !value)}
                  >
                    <i className={`fas ${isManualTexto ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                    <span>{isManualTexto ? 'Modo manual' : 'Modo CSV'}</span>
                  </button>
                </div>
                <input
                  id="numeros-texto"
                  className={`input-field ${!isManualTexto ? 'auto-mode' : ''}`}
                  disabled={!isManualTexto}
                  value={numerosTexto}
                  onChange={(event) => setNumerosTexto(event.target.value)}
                  placeholder="Ingrese números separados por comas"
                />
                {!isManualTexto && (
                  <div className="csv-row">
                    <button type="button" className="btn" onClick={() => csvInputTextoRef.current?.click()}>
                      <i className="fas fa-file-csv"></i> Cargar CSV
                    </button>
                    <span className="csv-count">
                      {csvCountTexto > 0 ? `${csvCountTexto} números cargados` : 'Importe un CSV con una columna de números'}
                    </span>
                    {csvCountTexto > 0 && (
                      <button type="button" className="btn btn-outline" onClick={clearCsvTexto}>
                        <i className="fas fa-trash"></i> Descartar
                      </button>
                    )}
                    <input ref={csvInputTextoRef} type="file" accept=".csv" className="hidden" onChange={handleCsvTexto} />
                  </div>
                )}
                <p className="input-hint">Separe los números con comas. Incluya el código de país (ej. 521234567890)</p>
              </div>

              <div className="field-group">
                <label htmlFor="mensaje"><i className="fas fa-envelope"></i> Mensaje</label>
                <textarea
                  id="mensaje"
                  className="textarea-field"
                  value={mensaje}
                  onChange={(event) => setMensaje(event.target.value)}
                  placeholder="Escriba su mensaje aquí"
                />
              </div>

              <div className="actions">
                <button id="send-btn" className="btn" onClick={enviarMensajes}>
                  <i className="fas fa-paper-plane"></i> Enviar mensajes
                </button>
              </div>
            </div>

            <div className="mensajes-content" role="tabpanel" hidden={activeTab !== 'media'}>
              <div className="field-group">
                <div className="field-group__header">
                  <label htmlFor="media-numeros"><i className="fas fa-phone"></i> Números de destino</label>
                  <button
                    type="button"
                    className="mode-toggle"
                    onClick={() => setIsManualMedia((value) => !value)}
                  >
                    <i className={`fas ${isManualMedia ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                    <span>{isManualMedia ? 'Modo manual' : 'Modo CSV'}</span>
                  </button>
                </div>
                <input
                  id="media-numeros"
                  className={`input-field ${!isManualMedia ? 'auto-mode' : ''}`}
                  disabled={!isManualMedia}
                  value={numerosMedia}
                  onChange={(event) => setNumerosMedia(event.target.value)}
                  placeholder="Ingrese números separados por comas"
                />
                {!isManualMedia && (
                  <div className="csv-row">
                    <button type="button" className="btn" onClick={() => csvInputMediaRef.current?.click()}>
                      <i className="fas fa-file-csv"></i> Cargar CSV
                    </button>
                    <span className="csv-count">
                      {csvCountMedia > 0 ? `${csvCountMedia} números cargados` : 'Importe un CSV con una columna de números'}
                    </span>
                    {csvCountMedia > 0 && (
                      <button type="button" className="btn btn-outline" onClick={clearCsvMedia}>
                        <i className="fas fa-trash"></i> Descartar
                      </button>
                    )}
                    <input ref={csvInputMediaRef} type="file" accept=".csv" className="hidden" onChange={handleCsvMedia} />
                  </div>
                )}
                <p className="input-hint">Separe los números con comas. Incluya el código de país.</p>
              </div>

              <div className="field-grid">
                <div className="field-group">
                  <label><i className="fas fa-info-circle"></i> Tipo detectado</label>
                  <div className="type-display">{autoTypeNode}</div>
                </div>
                <div className="field-group">
                  <label htmlFor="mediaFile"><i className="fas fa-upload"></i> Seleccionar archivo</label>
                  <input ref={fileInputRef} type="file" id="mediaFile" className="input-field" onChange={handleFileChange} />
                  <p className="input-hint">Seleccione el archivo que desea enviar</p>
                </div>
              </div>

              <div className="hidden">
                <input type="text" readOnly value={mediaBase64} aria-hidden />
              </div>

              <div className="field-grid">
                <div className="field-group">
                  <label htmlFor="fileName"><i className="fas fa-file-signature"></i> Nombre del archivo</label>
                  <input
                    id="fileName"
                    className="input-field"
                    value={fileName}
                    onChange={(event) => setFileName(event.target.value)}
                    placeholder="mi_archivo.jpg"
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="caption"><i className="fas fa-comment"></i> Leyenda (opcional)</label>
                  <textarea
                    id="caption"
                    className="textarea-field"
                    value={caption}
                    onChange={(event) => setCaption(event.target.value)}
                    placeholder="Escriba una descripción para el medio"
                  />
                </div>
              </div>

              <div className="media-preview">
                <p><i className="fas fa-eye"></i> Vista previa del archivo</p>
                <div id="preview-content">{renderPreview(mediaType, mediaBase64, mimeType)}</div>
              </div>

              <div className="actions">
                <button id="send-media-btn" className="btn btn-secondary" onClick={enviarMedios}>
            <i className="fas fa-photo-film"></i> Enviar medios
                </button>
              </div>
            </div>
          </section>

          <section className="mensajes-card mensajes-results">
            <div className="results-header">
              <div>
                <span className="results-chip"><i className="fas fa-chart-bar"></i> Resultados</span>
                <h2 className="results-title">Resumen del envío</h2>
                <p>Consulta rápidamente el estado general y profundiza en los detalles técnicos cuando lo necesites.</p>
              </div>
              <div className="results-actions">
                <button className="btn btn-outline" onClick={() => setShowDetails((value) => !value)}>
                  <i className="fas fa-info-circle"></i> {showDetails ? 'Ocultar detalles' : 'Ver detalles'}
                </button>
                <button className="btn btn-outline" onClick={clearResults}>
                  <i className="fas fa-trash"></i> Limpiar
                </button>
              </div>
            </div>

            <div className="results-summary">{renderSummary(resultText)}</div>
            {showDetails && (
              <pre className="results-content" aria-label="Detalles técnicos">{resultText}</pre>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

function renderPreview(type: MediaType, base64: string, mime: string) {
  if (!base64) return null
  const src = `data:${mime};base64,${base64}`
  if (type === 'image') return <img src={src} alt="Vista previa" />
  if (type === 'video') return <video src={src} controls />
  if (type === 'audio') return <audio src={src} controls />
  return (
    <p>
      <i className="fas fa-file"></i> Archivo seleccionado ({mime})
    </p>
  )
}

// Render a friendly summary for non-technical users from raw API text
function renderSummary(raw: string) {
  if (!raw || raw.startsWith('//')) {
    return <p className="results-hint">Los resultados de sus envíos aparecerán aquí.</p>
  }
  let data: any = null
  try {
    data = JSON.parse(raw)
  } catch {
    // Not JSON: show as error string
    if (raw.startsWith('HTTP')) {
      return (
        <div className="summary">
          <div className="summary-row warning">
            <span className="label">Estado</span>
            <span className="value">{raw.split('\n')[0]}</span>
          </div>
          <p className="summary-note">No pudimos procesar detalles. Revise los detalles técnicos.</p>
        </div>
      )
    }
    return <p className="results-hint">{raw}</p>
  }

  // Try common shapes: {success:true, details:[], failed:[]} or custom
  const success = data.success ?? data.ok ?? data.status === 'ok'
  const sentTo = data.sentTo || data.numeros || data.to || []
  const countSent = data.countSent ?? data.sent?.length ?? (Array.isArray(sentTo) ? sentTo.length : 0)
  const failed = data.failed || data.errors || []
  const message = data.message || data.msg || (success ? 'Envío realizado' : 'Envío con problemas')

  return (
    <div className="summary">
      <div className={`summary-row ${success ? 'ok' : 'warning'}`}>
        <span className="label">Resultado</span>
        <span className="value">{success ? 'Enviado correctamente' : 'Con errores'}</span>
      </div>
      <div className="summary-row">
        <span className="label">Mensaje</span>
        <span className="value">{message}</span>
      </div>
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-card-title">Destinatarios</div>
          <div className="summary-card-value">{Array.isArray(sentTo) ? sentTo.length : countSent}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-title">Enviados</div>
          <div className="summary-card-value ok">{countSent}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-title">Fallidos</div>
          <div className="summary-card-value warning">{Array.isArray(failed) ? failed.length : 0}</div>
        </div>
      </div>
      {Array.isArray(failed) && failed.length > 0 && (
        <div className="summary-list">
          <div className="summary-list-title">No enviados</div>
          <ul>
            {failed.map((f: any, i: number) => (
              <li key={i}>
                <span className="badge error">{f?.numero || f?.to || 'desconocido'}</span>
                <span className="muted">{f?.reason || f?.error || 'Error no especificado'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
