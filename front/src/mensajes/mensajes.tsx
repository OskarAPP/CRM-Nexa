import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import './mensajes.css'
import {
  useTemplateManager,
  useCampaignHistory,
  renderSummary,
  countNumbersFromString,
  type MediaType,
  type TabKey,
} from './templateHistory'

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

  const [showDetails, setShowDetails] = useState(false)

  const { resultText, setResultText, clearResults } = useCampaignHistory()

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

  const {
    templateStatus,
    templateForm,
    setTemplateForm,
    templateFilter,
    setTemplateFilter,
    templateCounts,
    visibleTemplates,
    selectedTemplateId,
    openNewTemplateForm,
    closeTemplateForm,
    handleApplyTemplate,
    handleEditTemplate,
    handleDeleteTemplate,
    handleTemplateFormSubmit,
    buildDefaultTemplateName,
    formatTimestamp,
    templateNumbersSample,
    templateMediaSizeKb,
    currentTemplateNumbersCount,
    isEditingTemplate,
    showModalError,
  } = useTemplateManager({
    getUserId: resolveUserId,
    setActiveTab,
    text: {
      numeros: numerosTexto,
      setNumeros: setNumerosTexto,
      mensaje,
      setMensaje,
      isManual: isManualTexto,
      setIsManual: setIsManualTexto,
      setCsvCount: setCsvCountTexto,
    },
    media: {
      numeros: numerosMedia,
      setNumeros: setNumerosMedia,
      caption,
      setCaption,
      fileName,
      setFileName,
      mediaBase64,
      setMediaBase64,
      mediaType,
      setMediaType,
      mimeType,
      setMimeType,
      isManual: isManualMedia,
      setIsManual: setIsManualMedia,
      setCsvCount: setCsvCountMedia,
    },
  })

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

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
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

  async function handleCsvTexto(e: ChangeEvent<HTMLInputElement>) {
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

  async function handleCsvMedia(e: ChangeEvent<HTMLInputElement>) {
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

        <div className="mensajes-sidebar__card mensajes-sidebar__card--templates">
          <div className="mensajes-sidebar__card-header">
            <h3>Plantillas guardadas</h3>
            <span className="mensajes-status templates"><i className="fas fa-database"></i> {templateCounts.all}</span>
          </div>

          {templateStatus && (
            <div className={`template-alert ${templateStatus.type === 'success' ? 'is-success' : 'is-error'}`} role="status">
              <i className={`fas ${templateStatus.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}`}></i>
              <span>{templateStatus.message}</span>
            </div>
          )}

          <div className="templates-filter" role="radiogroup" aria-label="Filtro de plantillas">
            <button
              type="button"
              className={`template-filter-btn ${templateFilter === 'all' ? 'is-active' : ''}`}
              onClick={() => setTemplateFilter('all')}
            >
              Todas <span>{templateCounts.all}</span>
            </button>
            <button
              type="button"
              className={`template-filter-btn ${templateFilter === 'texto' ? 'is-active' : ''}`}
              onClick={() => setTemplateFilter('texto')}
            >
              Texto <span>{templateCounts.texto}</span>
            </button>
            <button
              type="button"
              className={`template-filter-btn ${templateFilter === 'media' ? 'is-active' : ''}`}
              onClick={() => setTemplateFilter('media')}
            >
              Multimedia <span>{templateCounts.media}</span>
            </button>
          </div>

          <div className="templates-list" role="list">
            {visibleTemplates.length === 0 && (
              <p className="templates-empty">
                <i className="fas fa-clipboard"></i> Aún no hay plantillas guardadas en este filtro.
              </p>
            )}
            {visibleTemplates.map((template) => (
              <article
                key={template.id}
                role="listitem"
                className={`template-card ${selectedTemplateId === template.id ? 'is-selected' : ''}`}
              >
                <button type="button" className="template-card__body" onClick={() => handleApplyTemplate(template)}>
                  <div className="template-card__icon">
                    <i className={`fas ${template.type === 'texto' ? 'fa-font' : 'fa-photo-film'}`}></i>
                  </div>
                  <div className="template-card__info">
                    <strong>{template.name}</strong>
                    <span className="template-card__meta">
                      {template.type === 'texto' ? 'Mensaje de texto' : 'Mensaje multimedia'} · {countNumbersFromString(template.payload.numeros)} destinatarios
                    </span>
                    <span className="template-card__date">Actualizada {formatTimestamp(template.updatedAt)}</span>
                  </div>
                </button>
                <div className="template-card__actions">
                  <button type="button" className="template-card__action" onClick={() => handleEditTemplate(template)}>
                    <i className="fas fa-pen"></i>
                  </button>
                  <button type="button" className="template-card__action is-danger" onClick={() => void handleDeleteTemplate(template)}>
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="templates-footer">
            <button type="button" className="mensajes-link" onClick={() => openNewTemplateForm('texto')}>
              <i className="fas fa-plus-circle"></i> Nueva plantilla de texto
            </button>
            <button type="button" className="mensajes-link" onClick={() => openNewTemplateForm('media')}>
              <i className="fas fa-plus-circle"></i> Nueva plantilla multimedia
            </button>
          </div>
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

            {activeTab === 'texto' && (
              <div className="mensajes-content" role="tabpanel" aria-hidden={false}>
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
                <button type="button" className="btn btn-outline" onClick={() => openNewTemplateForm('texto')}>
                  <i className="fas fa-floppy-disk"></i> Guardar como plantilla
                </button>
                <button id="send-btn" className="btn" onClick={enviarMensajes}>
                  <i className="fas fa-paper-plane"></i> Enviar mensajes
                </button>
              </div>
              </div>
            )}

            {activeTab === 'media' && (
              <div className="mensajes-content" role="tabpanel" aria-hidden={false}>
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
                <button type="button" className="btn btn-outline" onClick={() => openNewTemplateForm('media')}>
                  <i className="fas fa-floppy-disk"></i> Guardar como plantilla
                </button>
                <button id="send-media-btn" className="btn btn-secondary" onClick={enviarMedios}>
            <i className="fas fa-photo-film"></i> Enviar medios
                </button>
              </div>
              </div>
            )}
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

      {templateForm.open && (
        <div className="template-modal" role="dialog" aria-modal="true" aria-labelledby="template-modal-title">
          <div className="template-modal__backdrop" onClick={closeTemplateForm}></div>
          <div className="template-modal__container" onClick={(event) => event.stopPropagation()}>
            <form className="template-modal__content" onSubmit={handleTemplateFormSubmit}>
              <header className="template-modal__header">
                <div>
                  <h2 id="template-modal-title">{isEditingTemplate ? 'Actualizar plantilla' : 'Guardar configuración como plantilla'}</h2>
                  <p>Configure un nombre y descripción para reutilizar esta configuración de {templateForm.type === 'texto' ? 'mensaje de texto' : 'mensaje multimedia'} en futuras campañas.</p>
                </div>
                <button type="button" className="template-modal__close" onClick={closeTemplateForm} aria-label="Cerrar">
                  <i className="fas fa-xmark"></i>
                </button>
              </header>

              {showModalError && templateStatus && (
                <div className="template-alert is-error" role="alert">
                  <i className="fas fa-triangle-exclamation"></i>
                  <span>{templateStatus.message}</span>
                </div>
              )}

              <div className="template-modal__body">
                <div className="template-modal__field">
                  <label htmlFor="template-name"><i className="fas fa-tag"></i> Nombre de la plantilla</label>
                  <input
                    id="template-name"
                    className="input-field"
                    value={templateForm.name}
                    onChange={(event) => setTemplateForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder={buildDefaultTemplateName(templateForm.type)}
                    autoFocus
                  />
                </div>

                <div className="template-modal__field">
                  <label htmlFor="template-description"><i className="fas fa-comment-dots"></i> Descripción (opcional)</label>
                  <textarea
                    id="template-description"
                    className="textarea-field"
                    value={templateForm.description}
                    onChange={(event) => setTemplateForm((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Añada contexto para su equipo"
                    rows={3}
                  />
                </div>

                <div className="template-summary">
                  <div className="template-summary__card">
                    <span className="template-summary__label">Tipo</span>
                    <strong className="template-summary__value">{templateForm.type === 'texto' ? 'Mensaje de texto' : 'Mensaje multimedia'}</strong>
                  </div>
                  <div className="template-summary__card">
                    <span className="template-summary__label">Destinatarios</span>
                    <strong className="template-summary__value">{currentTemplateNumbersCount}</strong>
                    {templateNumbersSample.list.length > 0 && (
                      <small className="template-summary__hint">
                        {templateNumbersSample.list.join(', ')}{templateNumbersSample.hasMore ? '…' : ''}
                      </small>
                    )}
                  </div>
                  {templateForm.type === 'media' ? (
                    <div className="template-summary__card">
                      <span className="template-summary__label">Archivo adjunto</span>
                      <strong className="template-summary__value">{fileName || 'Sin archivo'}</strong>
                      <small className="template-summary__hint">{mimeType || 'application/octet-stream'} · {templateMediaSizeKb} KB</small>
                    </div>
                  ) : (
                    <div className="template-summary__card">
                      <span className="template-summary__label">Mensaje</span>
                      <small className="template-summary__hint template-summary__hint--multiline">{mensaje || 'Sin contenido'}</small>
                    </div>
                  )}
                </div>

                {templateForm.type === 'media' && templateMediaSizeKb > 3600 && (
                  <p className="template-summary__warning">
                    <i className="fas fa-exclamation-circle"></i> Este archivo está cerca del límite recomendado (4 MB). Considere optimizarlo para garantizar envíos exitosos.
                  </p>
                )}
              </div>

              <footer className="template-modal__footer">
                <button type="button" className="btn btn-outline" onClick={closeTemplateForm}>
                  <i className="fas fa-ban"></i> Cancelar
                </button>
                <button type="submit" className="btn">
                  <i className="fas fa-floppy-disk"></i> {isEditingTemplate ? 'Actualizar plantilla' : 'Guardar plantilla'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
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
